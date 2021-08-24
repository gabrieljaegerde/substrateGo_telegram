import { LowSync, JSONFileSync } from 'lowdb'
import _ from "lodash"

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

/*
const keyboardHunter = [
  ["\uD83D\uDCF7 Scan QR Code", "\uD83D\uDD0D Find treasures"],
  ["\uD83C\uDF81 My treasures"],
  ["Edit address", "\u26A0 Deposit \u26A0", "Withdraw"],
  ["\u2B05 Switch to creator mode"],
]*/

/*
const keyboardHunter = [
  ["\uD83D\uDCF7 Scan QR Code", "\uD83D\uDD0D Find treasures"],
  ["\uD83C\uDF81 My treasures"],
  ["\u2B05 Switch to creator mode", "\u2699 Account Settings"],
]*/
/*
const keyboardHunter = [
  ["Creator Mode"],
  ["Finder Mode"],
  ["\u2699 Account Settings"],
]

const keyboardHunted = [
  ["Create Treasure"],
  ["Edit treasures", "View stats"], //should be in submenu: list of existing collections, "Add new collection", sub-submenu: "Add/edit deposit address", "Edit Collection Name"
  ["\u2699 Account Settings", "Switch to finder mode \u27A1"],
]*/

/*
const keyboardHunted = [
  ["1. Generate QR Code", "2. Add New Treasure"],
  ["Edit treasures", "View stats"], //should be in submenu: list of existing collections, "Add new collection", sub-submenu: "Add/edit deposit address", "Edit Collection Name"
  
  ["Switch to finder mode \u27A1"],
]*/

const creatorKeyboard = [
  ["\uD83D\uDC8E Create treasure \uD83D\uDC8E"],
  ["\u270F Edit treasures", "\uD83D\uDCCA View stats"], //should be in submenu: list of existing collections, "Add new collection", sub-submenu: "Add/edit deposit address", "Edit Collection Name"
  ["\u2B05 Back to main menu"],
]

const finderKeyboard = [
  ["\uD83D\uDCF7 Collect treasure", "\uD83D\uDD0D Find treasures"],
  ["\uD83C\uDF81 My treasures"],
  ["\u2B05 Back to main menu"],
]

const accountLinkedKeyboard = [
  ["\uD83D\uDCEA Edit address", "\uD83E\uDDFE Withdraw balance"],
  ["\u2B05 Back to main menu"],
]

const accountNoLinkedBalanceKeyboard = [
  ["Link address", "\uD83E\uDDFE Withdraw balance"],
  ["\u2B05 Back to main menu"],
]

const accountNoLinkedKeyboard = [
  ["Link address", "\uD83D\uDCEA Edit address"],
  ["\u2B05 Back to main menu"],
]

const accountNoAddressKeyboard = [
  ["\uD83D\uDCEA Add address"],
  ["\u2B05 Back to main menu"],
]

const mainKeyboard = [
  ["\uD83E\uDDD9\uD83C\uDFFB\u200D\u2640 Creator Mode"],
  ["\uD83D\uDD75\uD83C\uDFFE\u200D\u2642 Finder Mode"],
  ["\uD83D\uDEE0 Account Settings"],
]

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
        else if (user.wallet.address && !user.wallet.linked && user.wallet.balance === 0) {
          return accountNoLinkedKeyboard
        }
        else if (user.wallet.address && !user.wallet.linked && user.wallet.balance > 0) {
          return accountNoLinkedBalanceKeyboard
        }
        return accountNoAddressKeyboard
    }
  }
  return mainKeyboard
}

function getDb() {
  const db = new LowSync(new JSONFileSync(process.env.DB_FILE_PATH))
  //db.chain = _.chain(db.data)
  return db
}

function getLocalStorage() {
  const db = new LowSync(new JSONFileSync(process.env.LOCAL_STORAGE_DB_FILE_PATH))
  //db.chain = _.chain(db.data)
  return db
}

function getRemarkStorage() {
  const db = new LowSync(new JSONFileSync(process.env.REMARK_STORAGE_DB_FILE_PATH))
  //db.chain = _.chain(db.data)
  return db
}

export {
  botParams,
  getKeyboard,
  getDb,
  getLocalStorage,
  getRemarkStorage,
}
