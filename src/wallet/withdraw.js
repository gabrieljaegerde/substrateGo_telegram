import { Markup } from "telegraf"
import { botParams, getKeyboard } from "../../config.js"
import _ from "lodash"
import { MenuTemplate,
  MenuMiddleware,
  createBackMainMenuButtons,
  deleteMenuFromContext } from "telegraf-inline-menu"
import { withdraw, getTransactionCost } from "../network/accountHandler.js"
import { setSessionWallet } from "./helpers.js"
import { editWalletMiddleware } from "./edit.js"


//create submenu for withdrawal
const withdrawBalance = new MenuTemplate(async ctx => {
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
  await setSessionWallet(ctx)
  var reply
  if (ctx.session.wallet.balance > 0 && ctx.session.wallet.linked){
    let info = await getTransactionCost("transfer", user.wallet.address, user.wallet.balance)
    //format to human
    reply = `With your current balance of ${user.wallet.balance} the withdrawal will incur a ` +
      `fee of ${info.partialFee}. A total of ${parseInt(user.wallet.balance) - parseInt(info.partialFee)} ` +
      `should arrive in your wallet. Do you wish to proceed with the withdrawal?`
  }
  else if (ctx.session.wallet.balance > 0 && !ctx.session.wallet.linked)
  {
    reply = `You can only withdraw your funds to the same wallet they came from (security reasons).\n\n` +
      `As that wallet is currently not linked to this account, you are not able to withdraw at this moment.\n\n` +
      `Please first link this account to the wallet again by clicking on 'Link address' in the menu below.`
  }
  else {
    reply = `You have nothing to withdraw... Your balance is 0.`
  }
  return reply
})

withdrawBalance.interact("Proceed", "pr", {
  do: async ctx => {
    /*
    if (!ctx.session.wallet || ctx.session.wallet.balance === 0){
      return "/"
    }*/
    let success = await withdrawFunds(ctx)
    if(success){
      setSessionWallet(ctx)
      await deleteMenuFromContext(ctx)
      if (ctx.session.addressChange){
        editWalletMiddleware.replyToContext(ctx)
      }
      return false
      //show a certain menu or non...
    }
    else{
      //await deleteMenuFromContext(ctx)
      return "withdraw/"
      //show a certain menu
    }
  },
  joinLastRow: true,
  hide: ctx => {
    return !ctx.session.wallet.balance > 0 || !ctx.session.wallet.linked
  },
})

withdrawBalance.interact("Cancel", "c", {
  do: async ctx => {
    /*
    if (!ctx.session.wallet || ctx.session.wallet.balance === 0){
      return "/"
    }*/
    await deleteMenuFromContext(ctx)
    editWalletMiddleware.replyToContext(ctx)
    return false
  },
  joinLastRow: true,
  hide: ctx => {
    return !ctx.session.wallet.balance > 0 || !ctx.session.wallet.linked
  },
})

withdrawBalance.manualRow(createBackMainMenuButtons())

const withdrawBalanceMiddleware = new MenuMiddleware('withdraw/', withdrawBalance)

async function withdrawFunds(ctx) {
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
  let { success, response }  = await withdraw(user.wallet.address, user.wallet.balance)
  console.log("sucess:",success)
  console.log("response:",response)
  if (!success){
    let reply = "An error occured with the withdrawal. Please try again. If this issue persists, " +
      "please contact @xxx on telegram."
    ctx.replyWithMarkdown(
      response ? response : reply,
      Markup.keyboard(getKeyboard(ctx)).resize()
    )
    return false
  }
  var new_user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id })
    .get("wallet").assign({ balance : 0 }).value()
  botParams.db.write()
  var reply = "Funds were sent back to you. You can now go ahead and change your address."
  ctx.replyWithMarkdown(
    reply,
    Markup.keyboard(getKeyboard(ctx)).resize()
  )
  return true
}

export {
  withdrawFunds,
  withdrawBalanceMiddleware,
}
