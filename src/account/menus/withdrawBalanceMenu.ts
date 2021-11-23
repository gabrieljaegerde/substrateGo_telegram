import { botParams, getKeyboard } from "../../../config.js";
import {
  MenuTemplate,
  MenuMiddleware,
  createBackMainMenuButtons,
  deleteMenuFromContext
} from "grammy-inline-menu";
import { withdraw, getTransactionCost } from "../../network/accountHandler.js";
import { amountToHumanString, bigNumberArithmetic, bigNumberComparison } from "../../../tools/utils.js";
import User, { IUser } from "../../models/user.js";
import { InlineKeyboard } from "grammy";
import { enterWithdrawAmount } from "../enterWithdrawAmount.js";
import { CustomContext } from "../../../types/CustomContext.js";

//create submenu for withdrawal
const withdrawBalance = new MenuTemplate<CustomContext>(async (ctx) => {
  const session = await ctx.session;
  session.hideWithdrawButtons = false;
  const loadMessage = await botParams.bot.api
    .sendMessage(ctx.chat.id, "Loading...");
  const user: IUser = await User.findOne({ chatId: ctx.chat.id });
  let message: string;
  const userBalance = user.getBalance();
  if (user.withdrawalAllowed(session.withdrawAmount, userBalance)) {
    const info = await getTransactionCost(
      "transfer",
      user.wallet.address,
      session.withdrawAmount
    );
    //format to human
    const amountToArrive = bigNumberArithmetic(session.withdrawAmount, info.partialFee.toString(), "-");
    if (bigNumberComparison(amountToArrive, "0", ">")) {
      message = `The *withdrawal* of _${amountToHumanString(session.withdrawAmount)}_ will incur an approximate ` +
        `*fee* of _${amountToHumanString(info.partialFee.toString())}_. A total of ~*${amountToHumanString(amountToArrive)}* ` +
        `should arrive in your wallet:\n\n*${user.wallet.address}*\n\nDo you wish to proceed with the withdrawal?`;
    }
    else {
      session.hideWithdrawButtons = true;
      message = `The *withdrawal* of _${amountToHumanString(session.withdrawAmount)}_ will incur a ` +
        `*fee* of _${amountToHumanString(info.partialFee.toString())}_. Since the fee *exceeds* the actual withdrawal amount, ` +
        `it is *not* possible to withdraw such a small amount.`;
      await ctx.reply(
        message,
        {
          reply_markup: {
            keyboard: (await getKeyboard(ctx)).build(),
            resize_keyboard: true
          },
          parse_mode: "Markdown",
        }
      );
      if (bigNumberComparison(userBalance, info.partialFee.toString(), ">")) {
        const replyMsg = `Try withdrawing a *bigger* amount.`;
        enterWithdrawAmount.replyWithMarkdown(ctx, replyMsg);
      }
      else {
        message = "If this is your entire balance, try increasing it by creating treasures 😉.\n\n_Creators " +
          `get a reward whenever their treasures are collected!_`;
      }
    }
  }
  else {
    session.hideWithdrawButtons = true;
    message = `You have nothing to withdraw... Your balance is 0. Nice try. 😉`;
  }
  botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id);
  return { text: message, parse_mode: 'Markdown' };
});

withdrawBalance.interact("Proceed", "pr", {
  do: async (ctx: CustomContext) => {
    await deleteMenuFromContext(ctx);
    const loadMessage = await botParams.bot.api
      .sendMessage(ctx.chat.id, "Loading...");
    const success = await withdrawFunds(ctx);
    if (success) {
      botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id);
      return false;
    }
    else {
      botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id);
      return false;
    }
  },
  joinLastRow: true,
  hide: async (ctx: CustomContext) => {
    const session = await ctx.session;
    return session.hideWithdrawButtons;
  },
});

withdrawBalance.interact("Cancel", "c", {
  do: async (ctx: CustomContext) => {
    await deleteMenuFromContext(ctx);
    const message = "Withdrawal canceled";
    await ctx.reply(message, {
      reply_markup: {
        keyboard: (await getKeyboard(ctx)).build(),
        resize_keyboard: true
      },
    });
    return false;
  },
  joinLastRow: true,
  hide: async (ctx: CustomContext) => {
    const session = await ctx.session;
    return session.hideWithdrawButtons;
  },
});

withdrawBalance.manualRow(createBackMainMenuButtons());

export const withdrawBalanceMiddleware = new MenuMiddleware('withdraw/', withdrawBalance);

const withdrawFunds = async (ctx: CustomContext) => {
  const session = await ctx.session;
  const user: IUser = await User.findOne({ chatId: ctx.chat.id });
  const { block, success, hash } = await withdraw(
    user.wallet.address,
    session.withdrawAmount,
    user);
  if (!success) {
    console.log(`${new Date()} an error occured with withdrawal of ${session.withdrawAmount} by user ${user._id} ` +
      `hash: ${hash}`);
    const reply = "An error occured with the withdrawal. Please try again. If this issue persists, " +
      `please contact an admin at ${botParams.settings.telegramGroupLink} on telegram.`;
    const inlineKeyboard = new InlineKeyboard();
    botParams.settings
      .getExtrinsicLinks(
        botParams.settings.network.name,
        hash
      )
      .map(row => {
        return row.map(link => {
          return inlineKeyboard.url(link[0], link[1]);
        });
      });
    await botParams.bot.api
      .sendMessage(ctx.chat.id, reply, { reply_markup: inlineKeyboard, parse_mode: "Markdown" });
    return false;
  }
  user.subtractFromBalance(session.withdrawAmount);
  await user.save();
  console.log(`user ${user._id} new balance: ${user.getBalance()}`);
  const reply = `${amountToHumanString(session.withdrawAmount)} were sent to wallet with ` +
    `address:\n${user.wallet.address}`;
  session.withdrawAmount = null;
  const inlineKeyboard = new InlineKeyboard();
  botParams.settings
    .getExtrinsicLinks(
      botParams.settings.network.name,
      hash
    )
    .map(row => {
      return row.map(link => {
        return inlineKeyboard.url(link[0], link[1]);
      });
    });
  await botParams.bot.api
    .sendMessage(ctx.chat.id, reply, { reply_markup: inlineKeyboard, parse_mode: "Markdown" });
  const message = `Your current wallet balance is ${amountToHumanString(user.getBalance())}`;
  await ctx.reply(message, {
    reply_markup: {
      keyboard: (await getKeyboard(ctx)).build(),
      resize_keyboard: true
    },
  });
  return true;
};