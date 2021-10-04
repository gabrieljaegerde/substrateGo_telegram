import _ from "lodash"
import { botParams } from "../../config.js"
import BigNumber from "bignumber.js"

function amountToHuman(amount: string, afterCommas?: number) {
  var decimals = parseInt(botParams.settings.network.decimals)
  var token = botParams.settings.network.token
  var value = new BigNumber(amount.toString())
    .dividedBy(new BigNumber("1e" + decimals))
    .toFixed(afterCommas ? afterCommas : 5, BigNumber.ROUND_FLOOR)
  var tokenString = token ? " " + token : ""
  return { value: value, tokenString: tokenString }
}

function amountToHumanString(amount: string, afterCommas?: number) {
  var decimals = parseInt(botParams.settings.network.decimals)
  var token = botParams.settings.network.token
  var value = new BigNumber(amount.toString())
    .dividedBy(new BigNumber("1e" + decimals))
    .toFixed(afterCommas ? afterCommas : 5, BigNumber.ROUND_FLOOR)
  var tokenString = token ? " " + token : ""
  return value + tokenString
}

function bigNumberArithmetic(amount1: string, amount2: string, sign: string): string {
  if (sign === "-")
    return new BigNumber(amount1.toString()).minus(new BigNumber(amount2.toString())).toString()
  else if (sign === "+")
    return new BigNumber(amount1.toString()).plus(new BigNumber(amount2.toString())).toString()
}

function bigNumberComparison(amount1: string, amount2: string, sign: string): boolean {
  if (sign === ">=")
    return new BigNumber(amount1.toString()).isGreaterThanOrEqualTo(new BigNumber(amount2.toString()))
  else if (sign === "<")
    return new BigNumber(amount1.toString()).isLessThan(new BigNumber(amount2.toString()))
  else if (sign === ">")
    return new BigNumber(amount1.toString()).isGreaterThan(new BigNumber(amount2.toString()))
}

export {
  amountToHuman,
  amountToHumanString,
  bigNumberArithmetic,
  bigNumberComparison
}
