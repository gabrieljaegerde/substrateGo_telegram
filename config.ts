import { LowSync, JSONFileSync } from 'lowdb'
import _ from "lodash"
import { bigNumberArithmetic, amountToHumanString, bigNumberComparison } from './src/wallet/walletHelpers.js'
import User, { IUser } from "./src/models/user.js"
import mongoose from "mongoose"

interface BotParams {
  api: {},
  db: {
    data: {},
    chain: {},
  },
  localStorage: {},
  remarkStorage: {},
  account: {},
  settings: {},
  bot: {},
  pinata: {}
}

let botParams: any = {} as BotParams;

const startKeyboard = [
  ["Add address"]
]

const creatorKeyboard = [
  ["💎 Create treasure 💎"],
  ["✏️ Edit treasures", "📊 View stats"], //should be in submenu: list of existing collections, "Add new collection", sub-submenu: "Add/edit deposit address", "Edit Collection Name"
  ["\u2B05 Back to main menu"],
]

const finderKeyboard = [
  ["📷 Collect treasure", "🔍 Find treasures"],
  ["🎁 My treasures"],
  ["\u2B05 Back to main menu"],
]

const accountLinkedKeyboard = [
  ["\uD83D\uDCEA Edit address", "\uD83E\uDDFE Withdraw"],
  ["\u2B05 Back to main menu"],
]

const accountNoLinkedBalanceKeyboard = [
  ["🔗 Link address", "\uD83E\uDDFE Withdraw"],
  ["\uD83D\uDCEA Edit address"],
  ["\u2B05 Back to main menu"],
]

const accountNoLinkedKeyboard = [
  ["🔗 Link address", "\uD83D\uDCEA Edit address"],
  ["\u2B05 Back to main menu"],
]

const accountNoAddressKeyboard = [
  ["\uD83D\uDCEA Add address"],
  ["\u2B05 Back to main menu"],
]

const mainKeyboard = [
  ["🧙🏻‍♀️ Creator Mode"],
  ["🕵🏾‍♂️ Finder Mode"],
  ["🛠️ Account Settings"],
]

function getMainLinkedKeyboard(userBalance) {
  return [
    ["🧙🏻‍♀️ Creator Mode"],
    ["🕵🏾‍♂️ Finder Mode"],
    [`🛠️ Account Settings   \u2705 (${userBalance})`],
  ]
}

function getMainNoLinkedKeyboard(userBalance) {
  return [
    ["🧙🏻‍♀️ Creator Mode"],
    ["🕵🏾‍♂️ Finder Mode"],
    [`🛠️ Account Settings   \u274C (${userBalance})`],
  ]
}

function getMainRewardBalanceKeyboard(userBalance) {
  return [
    ["🧙🏻‍♀️ Creator Mode"],
    ["🕵🏾‍♂️ Finder Mode"],
    [`🛠️ Account Settings   (${userBalance})`],
  ]
}

async function getKeyboard(ctx) {
  if (ctx.session.menu) {
    switch (ctx.session.menu) {
      case "finder":
        return finderKeyboard
      case "creator":
        return creatorKeyboard
      case "account":
        var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
        var userBalance = user.getBalance()
        if (user.wallet && user.wallet.address && user.wallet.linked) {
          return accountLinkedKeyboard
        }
        else if (user.wallet && user.wallet.address && !user.wallet.linked &&
          userBalance === "0") {
          return accountNoLinkedKeyboard
        }
        else if (user.wallet && user.wallet.address && !user.wallet.linked &&
          bigNumberComparison(userBalance, "0", ">")) {
          return accountNoLinkedBalanceKeyboard
        }
        return accountNoAddressKeyboard
      case "main":
        var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
        var userBalance = user.getBalance()
        if (user.wallet && user.wallet.address && user.wallet.linked) {
          return getMainLinkedKeyboard(amountToHumanString(
            userBalance, 2))
        }
        else if (user.wallet && user.wallet.address && !user.wallet.linked) {
          return getMainNoLinkedKeyboard(amountToHumanString(
            userBalance, 2))
        }
        else if (!user.wallet && bigNumberComparison(user.reward_balance, "0", ">")) {
          return getMainRewardBalanceKeyboard(amountToHumanString(user.reward_balance, 2))
        }
        return mainKeyboard
    }
  }
  return mainKeyboard
}

async function getDb() {
  const uri = process.env.MONGO_URI
  try {
    await mongoose.connect(uri)
    console.log('MongoDB Connected...')
  } catch (err) {
    console.log(err)
  }
}

function getLocalStorage() {
  const db = new LowSync(new JSONFileSync(process.env.LOCAL_STORAGE_DB_FILE_PATH))
  return db
}

function getRemarkStorage() {
  const db = new LowSync(new JSONFileSync(process.env.REMARK_STORAGE_DB_FILE_PATH))
  return db
}

export {
  botParams,
  getKeyboard,
  getDb,
  getLocalStorage,
  getRemarkStorage,
}
