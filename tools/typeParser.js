import BigNumber from "bignumber.js"
import { botParams } from "../config.js"
import { stringShorten } from "@polkadot/util"

async function balanceToString(value, type, baseType, depth) {
  var decimals = botParams.settings.network.decimals
  if(decimals.toRawType != null && decimals.toRawType() === 'Option<Vec<u32>>'){
    decimals = decimals.toJSON()[0]
  }
  var token = botParams.settings.network.token
  if(decimals.toRawType != null && token.toRawType() === 'Option<Vec<Text>>'){
    token = token.toJSON()[0]
  }
  var value = new BigNumber(value.toString()).dividedBy(new BigNumber("1e" + decimals)).toFixed(4)
  var tokenString = token ? " " + token : ""
  return { value: value, tokenString: tokenString }
}


/**
 * Format BigInt price based on chain's decimal and symbol
 * @param price - string or number inputted price in plancks
 * @param systemProperties - chain's systemProperties as returned from polkadot api
 * @param toFixed - whether to format price to fixed number (will convert 1.0000 KSM to 1 KSM)
 */
/*
export const formatPrice = (
  price: bigint | string | number,
  systemProperties: ISystemProperties,
  toFixed: boolean = false,
) => {
  const numberPrice = forSaleToBigInt(price, systemProperties);

  const { tokenDecimals, tokenSymbol } = systemProperties;
  if (toFixed) {
    let formatted = formatBalance(numberPrice, {
      decimals: tokenDecimals,
      withUnit: false,
      forceUnit: '-',
    });
    return `${stringTrimTrailingZeros(formatted)} ${tokenSymbol}`;
  } else {
    return formatBalance(numberPrice, {
      decimals: tokenDecimals,
      withUnit: tokenSymbol,
      forceUnit: '-',
    });
  }
};*/

async function priceToString(value, type, baseType, depth) {
  return new BigNumber(value.toString())
    .dividedBy(new BigNumber("1e" + botParams.settings.network.decimals))
    .toFixed(4)
}

async function hexToString(value, type, baseType, depth) {
  var hex
  if (value.toString().startsWith("0x")) {
    var hex = value.toString().slice(2)
  } else hex = value.toString()
  var str = ""
  var char = ""
  for (var i = 0; i < hex.length; i += 2) {
    char += "%" + hex.substr(i, 2)
    try {
      str += decodeURIComponent(char)
      char = ""
    } catch {
      continue
    }
  }
  if (str == "") {
    return value.toString().length > 45
      ? stringShorten(value.toString(), 12)
      : value.toString()
  } else return str
}

export {
  balanceToString,
  priceToString,
  hexToString,
}
