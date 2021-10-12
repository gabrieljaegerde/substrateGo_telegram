import BigNumber from "bignumber.js"
import { botParams } from "../config.js"
import Jimp from "jimp"
import QrCode from "qrcode-reader"
import User, { IUser } from "../src/models/user.js"
import { ILocation } from "../src/models/location.js"

export const scan = async (url: string) => {
  try {
    const image = await Jimp.read(url)
    const qr = new QrCode()
    const value: any = await new Promise((resolve, reject) => {
      qr.callback = (err, v) => err != null ? reject(err) : resolve(v);
      qr.decode(image.bitmap);
    })
    return value.result
  }
  catch (err) {
    console.log("err", err)
    return "Error"
  }
}

export const decorateQr = async (url: Buffer) => {
  try {
    const canvas = await Jimp.read("assets/sticker.png")
    await canvas.resize(300, Jimp.AUTO)
    const qr = await Jimp.read(url)
    const logo = await Jimp.read(`assets/${botParams.settings.network.name}.png`)
    logo.resize(100, Jimp.AUTO);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_12_BLACK)
    canvas.composite(qr, 60, 95)
    canvas.composite(logo, 5, 270)
    const buffer = await canvas.getBufferAsync(Jimp.MIME_PNG)
    return buffer
  }
  catch (err) {
    return err
  }
}

function checkQr(result) {
  const re = `/^https://t.me/${botParams.settings.botUsername}?start=[a-zA-Z0-9]{${botParams.settings.codeLength}}$/`

}

export const distance = (location1: ILocation, location2: ILocation, unit: string) => {
  const radlat1 = Math.PI * location1.latitude / 180
  const radlat2 = Math.PI * location2.latitude / 180
  const theta = location1.longitude - location2.longitude
  const radtheta = Math.PI * theta / 180
  let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  if (dist > 1) {
    dist = 1;
  }
  dist = Math.acos(dist)
  dist = dist * 180 / Math.PI
  dist = dist * 60 * 1.1515
  if (unit == "K") { dist = dist * 1.609344 }
  if (unit == "N") { dist = dist * 0.8684 }
  return dist
}

export const amountToHuman = (amount: string, afterCommas?: number) => {
  const decimals = parseInt(botParams.settings.network.decimals)
  const token = botParams.settings.network.token
  const value = new BigNumber(amount.toString())
    .dividedBy(new BigNumber("1e" + decimals))
    .toFixed(afterCommas ? afterCommas : 5, BigNumber.ROUND_FLOOR)
  const tokenString = token ? " " + token : ""
  return { value: value, tokenString: tokenString }
}

export const amountToHumanString = (amount: string, afterCommas?: number): string => {
  const decimals = parseInt(botParams.settings.network.decimals)
  const token = botParams.settings.network.token
  const value = new BigNumber(amount.toString())
    .dividedBy(new BigNumber("1e" + decimals))
    .toFixed(afterCommas ? afterCommas : 5, BigNumber.ROUND_FLOOR)
  const tokenString = token ? " " + token : ""
  return value + tokenString
}

export const bigNumberArithmetic = (amount1: string, amount2: string, sign: string): string => {
  if (sign === "-")
    return new BigNumber(amount1.toString()).minus(new BigNumber(amount2.toString())).toString()
  else if (sign === "+")
    return new BigNumber(amount1.toString()).plus(new BigNumber(amount2.toString())).toString()
  else if (sign === "*")
    return new BigNumber(amount1.toString()).multipliedBy(new BigNumber(amount2.toString())).toString()
}

export const bigNumberComparison = (amount1: string, amount2: string, sign: string): boolean => {
  if (sign === ">=")
    return new BigNumber(amount1.toString()).isGreaterThanOrEqualTo(new BigNumber(amount2.toString()))
  else if (sign === "<")
    return new BigNumber(amount1.toString()).isLessThan(new BigNumber(amount2.toString()))
  else if (sign === ">")
    return new BigNumber(amount1.toString()).isGreaterThan(new BigNumber(amount2.toString()))
  else if (sign === "=")
    return new BigNumber(amount1.toString()).isEqualTo(new BigNumber(amount2.toString()))
}

export const checkIsGroup = async (ctx, checkAdmin = false): Promise<boolean> => {
  if (ctx.chat.type == "group" || ctx.chat.type == "supergroup") {
    if (checkAdmin) {
      const admins = await ctx.telegram.getChatAdministrators(ctx.chat.id)
      const from = ctx.from
      if (admins.find(a => a.user.id == from.id)) {
        return true
      } else return false
    } else return true
  } else return false
}

export const getGroupOrCreate = async (ctx): Promise<IUser> => {
  const group: IUser = await User.findOne({ chatId: ctx.chat.id })
  if (!group) {
    await new User({
      chatId: ctx.chat.id,
      type: ctx.chat.type,
      totalRewardBalance: "0",
      rewardBalance: "0",
      wallet: null,
      oldWallets: [],
      blocked: false,
    }).save()
  }
  return group
}

export const asyncFilter = async (arr, predicate) => {
  const results = await Promise.all(arr.map(predicate));
  return arr.filter((_v, index) => results[index]);
}

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
};

export const resetSession = async (ctx): Promise<void> => {
  const session = await ctx.session
  session.treasure = null
  session.guideStep = null
  session.guideMessage = null
  session.userCollected = null
  session.userCreated = null
  session.nft = null
  session.userNonCollectedRewards = null
  session.userCollectedRewards = null
  session.treasureLocation = null
  session.guideMessageChatId = null
  session.guideMessageMessageId = null
  session.createStep = ""
}

export const createCharityUser = async (): Promise<void> => {
  const user: IUser = await User.findOne({ chatId: botParams.settings.charityChatId })
  if (!user) {
    await new User({
      firstName: "charity",
      username: "ch_account",
      chatId: botParams.settings.charityChatId,
      type: "private",
      totalRewardBalance: "0",
      rewardBalance: "0",
      wallet: null,
      oldWallets: [],
      blocked: false
    }).save()
    console.log("Charity User Created")
  }
}
