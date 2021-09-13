import { LowSync, JSONFileSync } from 'lowdb'
import _ from "lodash"
import { addBigNumbers, amountToHumanString, compareBigNumbers } from './src/wallet/helpers.js'

const botParams = {
  api: {},
  ui: {
    modules: {},
    modes: [],
    commands: [],
  },
  db: {},
  networkStats: {},
  settings: {},
}

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

function getKeyboard(ctx) {
  if (ctx.session.menu) {
    switch (ctx.session.menu) {
      case "finder":
        return finderKeyboard
      case "creator":
        return creatorKeyboard
      case "account":
        botParams.db.read()
        botParams.db.chain = _.chain(botParams.db.data)
        var user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
        if (user.wallet.address && user.wallet.linked) {
          return accountLinkedKeyboard
        }
        else if (user.wallet.address && !user.wallet.linked && 
          addBigNumbers(user.wallet.balance, user.rewardBalance) === "0") {
          return accountNoLinkedKeyboard
        }
        else if (user.wallet.address && !user.wallet.linked && 
          compareBigNumbers(addBigNumbers(user.wallet.balance, user.rewardBalance), 0, ">")) {
          return accountNoLinkedBalanceKeyboard
        }
        return accountNoAddressKeyboard
      case "main":
        botParams.db.read()
        botParams.db.chain = _.chain(botParams.db.data)
        var user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
        if (user.wallet.address && user.wallet.linked) {
          return getMainLinkedKeyboard(amountToHumanString(
            addBigNumbers(user.wallet.balance, user.rewardBalance), 2))
        }
        else if (user.wallet.address && !user.wallet.linked) {
          return getMainNoLinkedKeyboard(amountToHumanString(
            addBigNumbers(user.wallet.balance, user.rewardBalance), 2))
        }
        else if (!user.wallet.balance && compareBigNumbers(user.rewardBalance, 0, ">")) {
          return getMainRewardBalanceKeyboard(amountToHumanString(user.rewardBalance, 2))
        }
        return mainKeyboard
    }
  }
  return mainKeyboard
}

function getDb() {
  const db = new LowSync(new JSONFileSync(process.env.DB_FILE_PATH))
  return db
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
