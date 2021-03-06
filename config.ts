import { LowSync, JSONFileSync } from 'lowdb';
import { InlineKeyboard, Keyboard } from "grammy";
import { amountToHumanString, bigNumberComparison } from "./tools/utils.js";
import User, { IUser } from "./src/models/user.js";
import mongoose from "mongoose";
import { CustomContext } from "./types/CustomContext.js";
import { ApiPromise } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import { Bot } from "grammy";
import { PinataClient } from "@pinata/sdk";
import { RunnerHandle } from '@grammyjs/runner';

type BotParams = {
  api: ApiPromise,
  remarkStorage: LowSync,
  account: KeyringPair,
  settings: any,
  bot: Bot,
  runnerHandle: RunnerHandle,
  pinata: PinataClient;
};

export const botParams: BotParams = {
  api: null,
  remarkStorage: null,
  account: null,
  settings: null,
  bot: null,
  runnerHandle: null,
  pinata: null
};

export const cancelSetupInlineKeyboard = new InlineKeyboard()
  .text("โ Cancel Setup");

export const cancelCollectInlineKeyboard = new InlineKeyboard()
  .text("โ Cancel Collection");

export const locationKeyboard = new Keyboard()
  .requestLocation("๐ Send Location");

const creatorKeyboard = new Keyboard()
  .text("๐๏ธ Create treasure ๐๏ธ").row()
  .text("โ๏ธ Edit treasures").text("๐ฆ View stats").row()
  .text("โฌ๏ธ Back to main menu");

const finderKeyboard = new Keyboard()
  .text("๐ท Collect treasure").requestLocation("๐ Find treasures").row()
  .text("๐๏ธ My treasures").row()
  .text("โฌ๏ธ Back to main menu");

const accountLinkedKeyboard = new Keyboard()
  .text("๐ช Edit address").text("๐งพ Withdraw").row()
  .text("โฌ๏ธ Back to main menu");

const accountNoLinkedBalanceKeyboard = new Keyboard()
  .text("๐ Link address").text("๐งพ Withdraw").row()
  .text("๐ช Edit address").row()
  .text("โฌ๏ธ Back to main menu");

const accountNoLinkedKeyboard = new Keyboard()
  .text("๐ Link address").text("๐ช Edit address").row()
  .text("โฌ๏ธ Back to main menu");

const accountNoAddressKeyboard = new Keyboard()
  .text("๐ช Add address").row()
  .text("โฌ๏ธ Back to main menu");

const mainKeyboard = new Keyboard()
  .text("๐ง๐ปโโ๏ธ Creator Mode").row()
  .text("๐ต๐พโโ๏ธ Finder Mode").row()
  .text("๐?๏ธ Account Settings");

const getMainLinkedKeyboard = (userBalance: string): Keyboard => {
  return new Keyboard()
    .text("๐ง๐ปโโ๏ธ Creator Mode").row()
    .text("๐ต๐พโโ๏ธ Finder Mode").row()
    .text(`๐?๏ธ Account Settings   \u2705 (${userBalance})`);
};

const getMainNoLinkedKeyboard = (userBalance: string): Keyboard => {
  return new Keyboard()
    .text("๐ง๐ปโโ๏ธ Creator Mode").row()
    .text("๐ต๐พโโ๏ธ Finder Mode").row()
    .text(`๐?๏ธ Account Settings   \u274C (${userBalance})`);
};

const getMainRewardBalanceKeyboard = (userBalance: string): Keyboard => {
  return new Keyboard()
    .text("๐ง๐ปโโ๏ธ Creator Mode").row()
    .text("๐ต๐พโโ๏ธ Finder Mode").row()
    .text(`๐?๏ธ Account Settings   (${userBalance})`);
};

export const getKeyboard = async (ctx: CustomContext): Promise<Keyboard> => {
  const session = await ctx.session;
  const user: IUser = await User.findOne({ chatId: ctx.chat.id });
  const userBalance = user.getBalance();
  switch (session.menu) {
    case "finder":
      return finderKeyboard;
    case "creator":
      return creatorKeyboard;
    case "account":
      if (user.wallet && user.wallet.address && user.wallet.linked) {
        return accountLinkedKeyboard;
      }
      else if (user.wallet && user.wallet.address && !user.wallet.linked &&
        userBalance === "0") {
        return accountNoLinkedKeyboard;
      }
      else if (user.wallet && user.wallet.address && !user.wallet.linked &&
        bigNumberComparison(userBalance, "0", ">")) {
        return accountNoLinkedBalanceKeyboard;
      }
      return accountNoAddressKeyboard;
    case "main":
      if (user.wallet && user.wallet.address && user.wallet.linked) {
        return getMainLinkedKeyboard(amountToHumanString(
          userBalance, 4));
      }
      else if (user.wallet && user.wallet.address && !user.wallet.linked) {
        return getMainNoLinkedKeyboard(amountToHumanString(
          userBalance, 4));
      }
      else if (!user.wallet && bigNumberComparison(user.rewardBalance, "0", ">")) {
        return getMainRewardBalanceKeyboard(amountToHumanString(user.rewardBalance, 4));
      }
      return mainKeyboard;
    default:
      return mainKeyboard;
  }

};

export const getDb = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  try {
    await mongoose.connect(uri);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.log(err);
  }
};

export const getRemarkStorage = (): LowSync => {
  const db = new LowSync(new JSONFileSync(process.env.REMARK_STORAGE_DB_FILE_PATH));
  return db;
};

