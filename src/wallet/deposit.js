import { MenuTemplate, MenuMiddleware, replyMenuToContext, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../config.js"
import { Markup } from "telegraf"
import { amountToHuman, amountToHumanString, getAccountDetails, setSessionWallet, setSessionUser, addBigNumbers } from "./helpers.js"
import _ from "lodash"
import { balanceToString } from "../../tools/typeParser.js"
import randomNumber from "random-number-csprng"

const deposit = new MenuTemplate(async ctx => {
  await setSessionUser(ctx)
  var sWallet = ctx.session.user.wallet
  if (!sWallet.address) {
    return `Please first add a ${botParams.settings.network.name} wallet to your account ` +
      `by clicking on 'Add Address' in the menu below.`
  }
  let balanceString = amountToHumanString(addBigNumbers(sWallet.balance, ctx.session.user.rewardBalance))
  var text = `*Address:* _${sWallet.address}_\n\n*Account Balance:* _${balanceString}_`
  var shortAddr = sWallet.address.substring(0, 3) +
    "..." +
    sWallet.address.substring(sWallet.address.length - 3)
  if (sWallet.linked) {
    text += "\n\n\u2705 The wallet with address " + shortAddr + " is currently linked to this account. You can " +
      `now go ahead and make a transfer from it to the deposit address of this bot: ` +
      "\n\n`" + botParams.settings.depositAddress + "`\n\nYour transfer amount " +
      `will then be automatically credited to your balance.`
    ctx.session.user = null
  }
  else {
    text += "\n\n\u274C The wallet with address " + shortAddr + " is *NOT* linked to this account! " + 
      "Please link the wallet ASAP!!!\n\n" +
      `_Do NOT transfer to the deposit address BEFORE having linked your wallet. Or you may loose ` +
      `your funds._`
  }
  return { text, parse_mode: 'Markdown' }
})

async function linkAddress(ctx) {
  const now = new Date()
  const quarterAfter = new Date(now.getTime() + (15 * 60 * 1000))
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
  user.wallet.password = await randomNumber(botParams.settings.pwordLower, botParams.settings.pwordUpper)
  user.wallet.expiry = quarterAfter
  botParams.db.write()
  let { value, tokenString } = amountToHuman(user.wallet.password, botParams.settings.network.decimals)
  //let value = user.wallet.password / 10 ** botParams.settings.network.decimals
  //let tokenString = botParams.settings.network.token
  //let { value, tokenString } = await balanceToString(user.wallet.password)
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
    Markup.keyboard(getKeyboard(ctx)).resize()
  )
  ctx.session.wallet = null
}

deposit.interact("🔗 Link address", "la", {
  do: async ctx => {
    linkAddress(ctx)
    await deleteMenuFromContext(ctx)
    return false
  },
  joinLastRow: true,
  hide: async ctx => {
    if (!ctx.session.wallet) {
      await setSessionWallet(ctx)
    }
    if (ctx.session.wallet.linked || !ctx.session.wallet.address) {
      return true
    }
    return false
  }
})

const depositMiddleware = new MenuMiddleware('deposit/', deposit)

export {
  depositMiddleware,
  linkAddress
}
