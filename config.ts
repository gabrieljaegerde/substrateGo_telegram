import { LowSync, JSONFileSync } from 'lowdb'
import { InlineKeyboard, Keyboard } from "grammy"
import { amountToHumanString, bigNumberComparison } from "./tools/utils.js"
import User, { IUser } from "./src/models/user.js"
import mongoose from "mongoose"
import { CustomContext } from "./types/CustomContext.js"
import { ApiPromise } from "@polkadot/api"
import { KeyringPair } from "@polkadot/keyring/types"
import { Bot } from "grammy"
import { PinataClient } from "@pinata/sdk"

type BotParams = {
  api: ApiPromise,
  remarkStorage: any,
  account: KeyringPair,
  settings: any,
  bot: Bot,
  pinata: PinataClient
}

export const botParams: BotParams = {
  api: null,
  remarkStorage: null,
  account: null,
  settings: null,
  bot: null,
  pinata: null
}

export const cancelSetupInlineKeyboard = new InlineKeyboard()
  .text("Cancel Setup")

  export const cancelCollectInlineKeyboard = new InlineKeyboard()
  .text("Cancel Collection")

export const cancelSetupKeyboard = new Keyboard()
  .text("Cancel Setup")

export const locationKeyboard = new Keyboard()
  .requestLocation("Send Location")

const creatorKeyboard = new Keyboard()
  .text("💎 Create treasure 💎").row()
  .text("✏️ Edit treasures").text("📊 View stats").row()
  .text("\u2B05 Back to main menu")

const finderKeyboard = new Keyboard()
  .text("📷 Collect treasure").requestLocation("🔍 Find treasures").row()
  .text("🎁 My treasures").row()
  .text("\u2B05 Back to main menu")

const accountLinkedKeyboard = new Keyboard()
  .text("📪 Edit address").text("🧾 Withdraw").row()
  .text("\u2B05 Back to main menu")

const accountNoLinkedBalanceKeyboard = new Keyboard()
  .text("🔗 Link address").text("🧾 Withdraw").row()
  .text("📪 Edit address").row()
  .text("\u2B05 Back to main menu")

const accountNoLinkedKeyboard = new Keyboard()
  .text("🔗 Link address").text("📪 Edit address").row()
  .text("\u2B05 Back to main menu")

const accountNoAddressKeyboard = new Keyboard()
  .text("📪 Add address").row()
  .text("\u2B05 Back to main menu")

const mainKeyboard = new Keyboard()
  .text("🧙🏻‍♀️ Creator Mode").row()
  .text("🕵🏾‍♂️ Finder Mode").row()
  .text("🛠️ Account Settings")

const getMainLinkedKeyboard = (userBalance) => {
  return new Keyboard()
    .text("🧙🏻‍♀️ Creator Mode").row()
    .text("🕵🏾‍♂️ Finder Mode").row()
    .text(`🛠️ Account Settings   \u2705 (${userBalance})`)
}

const getMainNoLinkedKeyboard = (userBalance) => {
  return new Keyboard()
    .text("🧙🏻‍♀️ Creator Mode").row()
    .text("🕵🏾‍♂️ Finder Mode").row()
    .text(`🛠️ Account Settings   \u274C (${userBalance})`)
}

const getMainRewardBalanceKeyboard = (userBalance) => {
  return new Keyboard()
    .text("🧙🏻‍♀️ Creator Mode").row()
    .text("🕵🏾‍♂️ Finder Mode").row()
    .text(`🛠️ Account Settings   (${userBalance})`)
}

export const getKeyboard = async (ctx: CustomContext) => {
  const session = await ctx.session
  const user: IUser = await User.findOne({ chatId: ctx.chat.id })
  const userBalance = user.getBalance()
  switch (session.menu) {
    case "finder":
      return finderKeyboard
    case "creator":
      return creatorKeyboard
    case "account":
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
      if (user.wallet && user.wallet.address && user.wallet.linked) {
        return getMainLinkedKeyboard(amountToHumanString(
          userBalance, 2))
      }
      else if (user.wallet && user.wallet.address && !user.wallet.linked) {
        return getMainNoLinkedKeyboard(amountToHumanString(
          userBalance, 2))
      }
      else if (!user.wallet && bigNumberComparison(user.rewardBalance, "0", ">")) {
        return getMainRewardBalanceKeyboard(amountToHumanString(user.rewardBalance, 2))
      }
      return mainKeyboard
    default:
      return mainKeyboard
  }

}

export const getDb = async (): Promise<void> => {
  const uri = process.env.MONGO_URI
  try {
    await mongoose.connect(uri)
    console.log('MongoDB Connected...')
  } catch (err) {
    console.log(err)
  }
}

export const getRemarkStorage = () => {
  const db = new LowSync(new JSONFileSync(process.env.REMARK_STORAGE_DB_FILE_PATH))
  return db
}

