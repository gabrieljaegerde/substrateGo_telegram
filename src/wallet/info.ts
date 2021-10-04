import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../config.js"
import { Markup } from "telegraf"
import { amountToHuman, amountToHumanString, bigNumberArithmetic } from "./walletHelpers.js"
import _ from "lodash"
import User, { IUser } from "../models/user.js"
import Wallet, { IWallet } from "../models/wallet.js"

const info = new MenuTemplate(async (ctx: any) => {
  var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
  var userWallet: IWallet = user.wallet
  ctx.session.wallet = userWallet
  if (!userWallet) {
    return `Please first add a ${botParams.settings.network.name} wallet to your account ` +
      `by clicking on 'Add Address' in the menu below.`
  }
  let balanceString = amountToHumanString(bigNumberArithmetic(userWallet.balance, user.reward_balance, "+"))
  var text = `*Address:* _${userWallet.address}_\n\n*Account Balance:* _${balanceString}_`
  var shortAddr = userWallet.address.substring(0, 3) +
    "..." +
    userWallet.address.substring(userWallet.address.length - 3)
  if (userWallet.linked) {
    text += "\n\n\u2705 The wallet with address " + shortAddr + " is currently linked to this account. You can " +
      `now go ahead and make a transfer from it to the deposit address of this bot: ` +
      "\n\n`" + botParams.settings.depositAddress + "`\n\nYour transfer amount " +
      `will then be automatically credited to your balance.`
  }
  else {
    text += "\n\n\u274C The wallet with address " + shortAddr + " is *NOT* linked to this account! " +
      "Please link the wallet ASAP!!!\n\n" +
      `_Do NOT transfer to the deposit address BEFORE having linked your wallet. Or you may loose ` +
      `your funds._`
  }
  return { text, parse_mode: 'Markdown' }
})

info.interact("🔗 Link address", "la", {
  do: async (ctx: any) => {
    linkAddress(ctx)
    await deleteMenuFromContext(ctx)
    return false
  },
  joinLastRow: true,
  hide: async (ctx: any) => {
    if (ctx.session.wallet && ctx.session.wallet.linked) {
      return true
    }
    return false
  }
})

async function linkAddress(ctx) {
  var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
  await user.wallet.setPassword()
  await user.save()
  let { value, tokenString } = amountToHuman(user.wallet.password, 
    parseInt(botParams.settings.network.decimals) - parseInt(botParams.settings.pwordDigitsToAdd))
  var reply = "Please make a *transfer* of exactly \n\n`" + value + "` " + tokenString +
    ` (This amount was randomly generated and thus acts as a *password* to ensure you ` +
    `are the rightful owner of the wallet. Do NOT share this amount with anyone!)` +
    "\n\n*FROM* the address you registered:" +
    `*\n\n${user.wallet.address}\n\n*` +
    "*TO* this address: \n\n`" + botParams.settings.depositAddress + "`\n\n" +
    "As soon as a transfer comes in, I will credit your account.\n\n" +
    "Please note that the password expires in 15 minutes! After which you will have to generate " +
    "a new one by clicking on '🔗 Link address' in the menu again." +
    `\n\nThe purpose of this transfer is to link your wallet with your account ` +
    `and allow for safe deposits and withdrawals in the future.`
  ctx.replyWithMarkdown(
    reply,
    Markup.keyboard(await getKeyboard(ctx)).resize()
  )
}

const infoMiddleware = new MenuMiddleware('in/', info)

export {
  infoMiddleware,
  linkAddress
}
