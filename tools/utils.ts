import { botParams } from "../config.js"
import _ from "lodash"
import BigNumber from "bignumber.js"

async function checkIsGroup(ctx, checkAdmin = false) {
  if (ctx.chat.type == "group" || ctx.chat.type == "supergroup") {
    if (checkAdmin) {
      var admins = await ctx.telegram.getChatAdministrators(ctx.chat.id)
      var from = ctx.from
      if (admins.find(a => a.user.id == from.id)) {
        return true
      } else return false
    } else return true
  } else return false
}

function getGroupOrCreate(ctx) {
  var group = botParams.db.get("users").find({ chatid: ctx.chat.id }).value()
  if (!group) {
    group = {
      chatid: ctx.chat.id,
      type: ctx.chat.type,
      wallets: [],
      enabled: false,
      blocked: false,
      price: false,
    }
    botParams.db.get("users").push(group).write()
  }
  return group
}

async function getAccountName(account, user) {
  if (user.wallets) {
    var wallet = user.wallets.find(w => w.address == account)
    if (wallet) return wallet.name
  }
  var accountInfo = await botParams.api.derive.accounts.info(account)
  if (accountInfo.identity.displayParent || accountInfo.identity.display) {
    var value = ""
    if (accountInfo.identity.displayParent) {
      value += accountInfo.identity.displayParent + ":"
    }
    if (accountInfo.identity.display) {
      value += accountInfo.identity.display
    }
    return value
  } else if (accountInfo.accountIndex) {
    return accountInfo.accountIndex
  }
  return account
}

export {
  checkIsGroup,
  getGroupOrCreate,
  getAccountName
}
