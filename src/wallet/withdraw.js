import { Markup } from "telegraf"
import { botParams, getKeyboard } from "../../config.js"
import _ from "lodash"
import {
  MenuTemplate,
  MenuMiddleware,
  createBackMainMenuButtons,
  deleteMenuFromContext
} from "telegraf-inline-menu"
import { withdraw, getTransactionCost } from "../network/accountHandler.js"
import { amountToHumanString, setSessionWallet } from "./helpers.js"
import { editWalletMiddleware } from "./edit.js"
import { amountToHuman } from "./helpers.js"

//create submenu for withdrawal
const withdrawBalance = new MenuTemplate(async ctx => {
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var loadMessage = await botParams.bot.telegram
    .sendMessage(ctx.chat.id, "Loading...")
  var user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
  await setSessionWallet(ctx)
  var reply
  if (ctx.session.wallet.balance > 0 && ctx.session.wallet.linked) {
    let info = await getTransactionCost("transfer", user.wallet.address, user.wallet.balance)
    //format to human
    reply = `With your current balance of ${amountToHumanString(user.wallet.balance)} the withdrawal will incur a ` +
      `fee of ${amountToHumanString(info.partialFee)}. A total of ${amountToHumanString(parseInt(user.wallet.balance) - parseInt(info.partialFee))} ` +
      `should arrive in your wallet. Do you wish to proceed with the withdrawal?`
  }
  else if (ctx.session.wallet.balance > 0 && !ctx.session.wallet.linked) {
    reply = `You can only withdraw your funds to the same wallet they came from (security reasons).\n\n` +
      `As that wallet is currently not linked to this account, you are not able to withdraw at this moment.\n\n` +
      `Please first link this account to the wallet again by clicking on 'Link address' in the menu below.`
  }
  else {
    reply = `You have nothing to withdraw... Your balance is 0.`
  }
  botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
  return reply
})

withdrawBalance.interact("Proceed", "pr", {
  do: async ctx => {
    /*
    if (!ctx.session.wallet || ctx.session.wallet.balance === 0){
      return "/"
    }*/
    var loadMessage = await botParams.bot.telegram
      .sendMessage(ctx.chat.id, "Loading...")
    let success = await withdrawFunds(ctx)
    if (success) {
      setSessionWallet(ctx)
      await deleteMenuFromContext(ctx)

      if (ctx.session.addressChange) {
        editWalletMiddleware.replyToContext(ctx)
      }
      botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
      return false
      //show a certain menu or non...
    }
    else {
      //await deleteMenuFromContext(ctx)
      botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
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
    if (ctx.session.addressChange) {
      editWalletMiddleware.replyToContext(ctx)
    }
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
  let { success, response } = await withdraw(user.wallet.address, user.wallet.balance)
  console.log("sucess:", success)
  console.log("response:", response)
  if (!success) {
    let reply = "An error occured with the withdrawal. Please try again. If this issue persists, " +
      "please contact @xxx on telegram."
    var links = botParams.settings
      .getExtrinsicLinks(
        botParams.settings.network.name,
        response
      )
      .map(row => {
        console.log("row", row)
        return row.map(link => {
          return Markup.button.url(link[0], link[1])
        })
      })
    await botParams.bot.telegram
      .sendMessage(ctx.chat.id, response ? response : reply, Markup.inlineKeyboard(links))
    /*
  ctx.replyWithMarkdown(
    response ? response : reply,
    Markup.keyboard(getKeyboard(ctx)).resize()
  )*/
    return false
  }
  var new_user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id })
    .get("wallet").assign({ balance: 0 }).value()
  botParams.db.write()
  var reply = "Funds were sent back to you."
  var links = botParams.settings
    .getExtrinsicLinks(
      botParams.settings.network.name,
      response
    )
    .map(row => {
      console.log("row", row)
      return row.map(link => {
        return Markup.button.url(link[0], link[1])
      })
    })
  await botParams.bot.telegram
    .sendMessage(ctx.chat.id, reply, Markup.inlineKeyboard(links))
  /*ctx.replyWithMarkdown(
    reply,
    Markup.keyboard(getKeyboard(ctx)).resize()
  )*/
  return true
}

export {
  withdrawFunds,
  withdrawBalanceMiddleware,
}
