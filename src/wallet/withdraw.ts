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
import { amountToHumanString, bigNumberArithmetic, bigNumberComparison } from "./walletHelpers.js"
import { editWalletMiddleware } from "./edit.js"
import { amountToHuman } from "./walletHelpers.js"
import TelegrafStatelessQuestion from "telegraf-stateless-question"
import BigNumber from "bignumber.js"
import User, { IUser } from "../models/user.js"

const enterAmount = new TelegrafStatelessQuestion("amt", async (ctx: any) => {
  var decimals = parseInt(botParams.settings.network.decimals)
  var withdrawAmount = new BigNumber(ctx.message.text)
    .multipliedBy(new BigNumber("1e" + decimals)).toString()
  ctx.session.withdrawAmount = withdrawAmount
  var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
  if (!user.wallet) {
    let replyMsg = "Please add an address to your account first by clicking on 'Add address'\n. " +
      "This is the address your withdrawal will be sent to.\n\n_While it is not " +
      "required to link your account to the address for a withdrawal, it is still " +
      "good practice to do so for you to ensure that you have entered the correct address._"
    return ctx.replyWithMarkdown(
      replyMsg,
      Markup.keyboard(await getKeyboard(ctx)).resize()
    )
  }
  var userBalance: string = user.getBalance()
  if (user.withdrawalAllowed(userBalance, withdrawAmount)) {
    let replyMsg = `The amount you entered (${amountToHumanString(withdrawAmount)}) is bigger ` +
      `than your balance of _${amountToHumanString(userBalance)}_.\n\n` +
      `Please enter an amount *less than* or *equal* to your balance.`
    return enterAmount.replyWithMarkdown(ctx, replyMsg)
  }
  if (bigNumberComparison(withdrawAmount, "0", "<")) {
    let replyMsg = "The amount *has* to be a *positive* number. Please enter an amount *greater* than *0*."
    return enterAmount.replyWithMarkdown(ctx, replyMsg)
  }
  withdrawBalanceMiddleware.replyToContext(ctx)
})

//create submenu for withdrawal
const withdrawBalance = new MenuTemplate(async (ctx: any) => {
  ctx.session.hideWithdrawButtons = false
  var loadMessage = await botParams.bot.telegram
    .sendMessage(ctx.chat.id, "Loading...")
  var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
  var reply: string
  var userBalance = user.getBalance()
  if (user.withdrawalAllowed(userBalance, ctx.session.withdrawAmount)) {
    let info = await getTransactionCost({
      type: "transfer",
      recipient: user.wallet.address,
      toSendAmount: ctx.session.withdrawAmount
    })
    //format to human
    let amountToArrive = bigNumberArithmetic(ctx.session.withdrawAmount, info.partialFee, "-")
    if (bigNumberComparison(amountToArrive, "0", ">")) {
      reply = `The *withdrawal* of _${amountToHumanString(ctx.session.withdrawAmount)}_ will incur a ` +
        `*fee* of _${amountToHumanString(info.partialFee)}_. A total of *${amountToHumanString(amountToArrive)}* ` +
        `should arrive in your wallet:\n\n*${user.wallet.address}*\n\nDo you wish to proceed with the withdrawal?`
    }
    else {
      ctx.session.hideWithdrawButtons = true
      reply = `The *withdrawal* of _${amountToHumanString(ctx.session.withdrawAmount)}_ will incur a ` +
        `*fee* of _${amountToHumanString(info.partialFee)}_. Since the fee *exceeds* the actual withdrawal amount, ` +
        `it is *not* possible to withdraw such a small amount.`
      await ctx.replyWithMarkdown(
        reply,
        Markup.keyboard(await getKeyboard(ctx)).resize()
      )
      if (bigNumberComparison(userBalance, info.partialFee, ">")) {
        let replyMsg = `Try withdrawing a *bigger* amount.`
        enterAmount.replyWithMarkdown(ctx, replyMsg)
      }
      else {
        reply = "If this is your entire balance, try increasing it by creating treasures 😉.\n\n_Creators " +
          `get a reward whenever their treasures are collected!_`
      }
    }
  }
  else {
    reply = `You have nothing to withdraw... Your balance is 0. Nice try. 😉`
  }
  botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
  return { text: reply, parse_mode: 'Markdown' }
})

withdrawBalance.interact("Proceed", "pr", {
  do: async (ctx: any) => {
    /*
    if (!ctx.session.wallet || ctx.session.wallet.balance === 0){
      return "/"
    }*/
    var loadMessage = await botParams.bot.telegram
      .sendMessage(ctx.chat.id, "Loading...")
    let success = await withdrawFunds(ctx)
    if (success) {
      await deleteMenuFromContext(ctx)
      botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
      return false
      //show a certain menu or non...
    }
    else {
      //await deleteMenuFromContext(ctx)
      botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
      return false
      //show a certain menu
    }
  },
  joinLastRow: true,
  hide: ctx => {
    return ctx.session.hideWithdrawButtons
  },
})

withdrawBalance.interact("Cancel", "c", {
  do: async (ctx: any) => {
    /*
    if (!ctx.session.wallet || ctx.session.wallet.balance === 0){
      return "/"
    }*/
    await deleteMenuFromContext(ctx)
    ctx.replyWithMarkdown(
      "Withdrawal canceled",
      Markup.keyboard(await getKeyboard(ctx)).resize()
    )
    return false
  },
  joinLastRow: true,
  hide: async (ctx: any) => {
    return ctx.session.hideWithdrawButtons
  },
})

withdrawBalance.manualRow(createBackMainMenuButtons())

const withdrawBalanceMiddleware = new MenuMiddleware('withdraw/', withdrawBalance)

async function withdrawFunds(ctx) {
  var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
  let { success, response } = await withdraw(
    user.wallet.address,
    ctx.session.withdrawAmount)
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
    return false
  }
  user.subtractFromBalance(ctx.session.withdrawAmount)
  await user.save()
  var reply = `${amountToHumanString(ctx.session.withdrawAmount)} were sent to wallet with ` +
    `address:\n${user.wallet.address}`
  ctx.session.withdrawAmount = null
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
  let walletInfo = `Your current wallet balance is ${amountToHumanString(user.getBalance())}`
  ctx.replyWithMarkdown(
    walletInfo,
    Markup.keyboard(await getKeyboard(ctx)).resize()
  )
  return true
}

export {
  enterAmount,
  withdrawFunds,
  withdrawBalanceMiddleware,
}
