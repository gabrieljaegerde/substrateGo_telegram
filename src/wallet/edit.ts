import { botParams, getKeyboard } from "../../config.js"
import _ from "lodash"
import { getAccountDetails, setSessionWallet } from "./walletHelpers.js"
import { MenuTemplate,
  MenuMiddleware,
  createBackMainMenuButtons,
  deleteMenuFromContext } from "telegraf-inline-menu"
import { checkAddress } from "@polkadot/util-crypto"
import TelegrafStatelessQuestion from "telegraf-stateless-question"
import { Markup } from "telegraf"
import { withdrawBalanceMiddleware } from "./withdraw.js"
import randomNumber from "random-number-csprng"
import BigNumber from "bignumber.js"
import { addWallet } from "./add.js"
import { IUser } from "../types.js"

const editWallet = new MenuTemplate(async (ctx: any) => {
  var reply
  await setSessionWallet(ctx)
  reply = await getAccountDetails(ctx.session.wallet)
  if (ctx.session.wallet.balance > 0) {
    reply += `\n\nShould you wish to change your address, we first have to withdraw your existing balance back to your existing wallet for fund security reasons.`
  }
  return reply
})

editWallet.interact("Change address", "r", {
  do: async (ctx: any) => {
    if (!ctx.session.wallet || ctx.session.wallet.balance > 0){
      editWalletMiddleware.replyToContext(ctx)
      return false
    }
    ctx.session.oldWallet = ctx.session.wallet

    var replyMsg = `Current Address: ${ctx.session.wallet.address}

Enter new ${botParams.settings.network.name} address:`

    enterAddress.replyWithMarkdown(ctx, replyMsg)
    await deleteMenuFromContext(ctx)
    return false
  },
  joinLastRow: true,
  hide: ctx => {
    if (!(ctx.session.wallet.balance > 0)){
      return false
    }
    return true
  },
})

editWallet.interact("Withdraw", "d", {
  do: async (ctx: any) => {
    if (!ctx.session.wallet || ctx.session.wallet.balance === 0){
      return ".."
    }
    await deleteMenuFromContext(ctx)
    withdrawBalanceMiddleware.replyToContext(ctx)
    //replyMenuToContext(withdrawBalance, ctx, '/withdraw/')

    return true
  },
  joinLastRow: true,
  hide: ctx => {
    if (ctx.session.wallet.balance > 0) {
      return false
    }
    return true
  },
})

editWallet.interact("Cancel", "c", {
  do: async (ctx: any) => {
    await deleteMenuFromContext(ctx)
    return false
  },
  joinLastRow: true,
  hide: ctx => {
    return false
  },
})

const editWalletMiddleware = new MenuMiddleware('wallet/', editWallet)

const enterAddress = new TelegrafStatelessQuestion("adr", async (ctx: any) => {
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var user: IUser = botParams.db.data.users.find(({ chatid }) => chatid === ctx.chat.id)
  var isValid
  var reply
  try {
    isValid = checkAddress(
      ctx.message.text,
      parseInt(botParams.settings.network.prefix)
    )[0]
  } catch (error) {
    isValid = false
  }
  if (!isValid) {
    await botParams.bot.telegram.sendMessage(user.chatid, `Incorrect address. Please try again.`)
    ctx.session.oldWallet = null
    addWallet(ctx)
    return
  }
  //check if the wallet has been registered already to send a warning?
  const hourInMs = 3600000 // 60 * 60 * 1000
  const now = new Date()
  const quarterAfter = new Date(now.getTime() + (15 * 60 * 1000))
  ctx.session.wallet = {
    address: ctx.message.text,
    balance: "0",
    timestamp: new Date(),
    linked: false,
    password: await randomNumber(botParams.settings.pwordLower, botParams.settings.pwordUpper),
    expiry: quarterAfter
  }
  console.log("ctx.session.wallet", ctx.session.wallet)
  var dbWallet = user.wallet
  //user is adding current address again

  if (dbWallet.address === ctx.session.wallet.address && !dbWallet.linked){
    console.log("dbWallet, ", dbWallet)
    console.log("ctx.session.wallet, ", ctx.session.wallet)
    //update pword and extend expiry
    user.wallet.password = await randomNumber(botParams.settings.pwordLower, botParams.settings.pwordUpper)
    user.wallet.expiry = quarterAfter.toString()
    console.log("user", user)
    //ctx.session.wallet.balance = parseInt(dbWallet.balance)
  }
  else if (dbWallet.address === ctx.session.wallet.address && dbWallet.linked){
    reply = "This address is already linked to your account. Any deposit you make will be " +
      "credited to this account. ALWAYS make sure that your wallet is still linked to your account " +
      "before making a deposit."
  }
  //user is wishing to add a new wallet address
  else if (dbWallet.address != ctx.session.wallet.address){
    if (!_.isEmpty(dbWallet)){
      var oldWallets = user.oldWallets
      oldWallets.push(dbWallet)
      user.oldWallets = oldWallets
      //botParams.db.write()
    }
    user.wallet = ctx.session.wallet

  }
  botParams.db.write()
  
  let value = new BigNumber(user.wallet.password).dividedBy(new BigNumber("1e" + botParams.settings.network.decimals)).toString()
  let tokenString = botParams.settings.network.token
  ctx.session.wallet = null
  ctx.session.oldWallet = null
  reply = reply ? reply : "Please make a *transfer* of exactly \n\n`" + value + "` " + tokenString +
    ` (This amount was randomly generated and thus acts as a password to ensure you ` +
    `are the rightful owner of it. Do NOT share this amount with anyone!)` +
    "\n\n*FROM* the address you registered:" +
    `\n\n*${user.wallet.address}*\n\n` +
    "*TO* this address: \n\n`" + botParams.settings.depositAddress + "`\n\n" +
    "As soon as a transfer comes in, I will credit your account.\n\n" +
    "Please note that the password expires in 15 minutes! After which you will have to generate " +
    "a new one by clicking on '🔗 Link address' in the menu again." +
    `\n\nThe purpose of this transfer is to link your wallet with your account ` +
    `and allow for safe transfers and withdrawals in the future.`
  ctx.replyWithMarkdown(
    reply,
    Markup.keyboard(getKeyboard(ctx)).resize()
  )
})

export {
  editWalletMiddleware,
  enterAddress
}
