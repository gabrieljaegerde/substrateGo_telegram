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

async function checkFilter(filter, action, actionType, config) {
  var arg, data

  if (actionType == "call" && filter.name == "sender") {
    if (!action.signer) {
      return false
    }
    var signer = action.signer
    var stash = await getStashAccount(signer.toString())
    var compareResult = filter.isEqual && filter.value == signer
    if (compareResult) return true
    else {
      if (stash.isSome) {
        compareResult =
          filter.isEqual && filter.value == stash.value.stash.toString()
        if (compareResult) return true
        else if (filter.source && filter.source == "nominator") {
          var targets = await getTargets(filter.value)
          if (
            targets.includes(signer.toString()) ||
            targets.includes(stash.value.stash.toString())
          ) {
            return true
          }
        }
      }
      return false
    }
  }

  if (actionType == "call") {
    arg = config.args.find(a => a.name == filter.name)
    if (!arg) return false
    data = action.args[filter.name]
  } else {
    arg = config.args.find(a => a.name == filter.name)
    if (!arg) return false
    if (!action.data) {
      console.log(
        new Date(),
        "Error No Data in action",
        action.toHuman ? action.toHuman() : action.toJSON()
      )
    }
    data = action.data[_.findIndex(config.args, a => a.name == filter.name)]
  }

  if (arg.type.startsWith("Vec<")) {
    var item = data.find(a => {
      if (
        (filter.isEqual && filter.value == a.toString()) ||
        (filter.isLess &&
          new BigNumber(a.toString()).isLessThan(
            new BigNumber(filter.value)
          )) ||
        (filter.isMore &&
          new BigNumber(a.toString()).isGreaterThan(
            new BigNumber(filter.value)
          ))
      )
        return true
      else return false
    })
    if (item) return true
    else return false
  } else if (
    (filter.isEqual && filter.value == data.toString()) ||
    (filter.isLess &&
      new BigNumber(data.toString()).isLessThan(new BigNumber(filter.value))) ||
    (filter.isMore &&
      new BigNumber(data.toString()).isGreaterThan(new BigNumber(filter.value)))
  ) {
    return true
  } else return false
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
  checkFilter,
  getAccountName
}
