import _ from "lodash"
import { botParams } from "../../config.js"
import { balanceToString } from "../../tools/typeParser.js"
import BigNumber from "bignumber.js"

async function setSessionWallet(ctx) {
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
  ctx.session.wallet = user.wallet
}

async function setSessionUser(ctx) {
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  ctx.session.user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
}

async function getAccountDetails(wallet) {
  let { value, tokenString } = await amountToHuman(wallet.balance)
  return `Address: ${wallet.address}\n\nBalance: ${value} ${tokenString}`
}

function amountToHuman(amount, afterCommas) {
  var decimals = botParams.settings.network.decimals
  var token = botParams.settings.network.token
  var value = new BigNumber(amount.toString())
    .dividedBy(new BigNumber("1e" + decimals))
    .toFixed(afterCommas ? parseInt(afterCommas) : 4)
  var tokenString = token ? " " + token : ""
  return { value: value, tokenString: tokenString }
}

function amountToHumanString(amount, afterCommas) {
  var decimals = botParams.settings.network.decimals
  var token = botParams.settings.network.token
  var value = new BigNumber(amount.toString())
    .dividedBy(new BigNumber("1e" + decimals))
    .toFixed(afterCommas ? parseInt(afterCommas) : 4, 1, BigNumber.ROUND_FLOOR)
  var tokenString = token ? " " + token : ""
  return value + tokenString
}

function bigNumberArithmetic(amount1, amount2, sign) {
  if (sign === ">=")
    return new BigNumber(amount1.toString()).isGreaterThanOrEqualTo(new BigNumber(amount2.toString()))
  else if (sign === "<")
    return new BigNumber(amount1.toString()).isLessThan(new BigNumber(amount2.toString()))
  else if (sign === ">")
    return new BigNumber(amount1.toString()).isGreaterThan(new BigNumber(amount2.toString()))
  else if (sign === "-")
    return new BigNumber(amount1.toString()).minus(new BigNumber(amount2.toString())).toString()
  else if (sign === "+")
    return new BigNumber(amount1.toString()).plus(new BigNumber(amount2.toString())).toString()
}

export {
  getAccountDetails,
  setSessionWallet,
  setSessionUser,
  amountToHuman,
  amountToHumanString,
  bigNumberArithmetic
}
