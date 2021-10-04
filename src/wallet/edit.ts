import { botParams, getKeyboard } from "../../config.js"
import _ from "lodash"
import {
  MenuTemplate,
  MenuMiddleware,
  deleteMenuFromContext
} from "telegraf-inline-menu"
import { checkAddress } from "@polkadot/util-crypto"
import TelegrafStatelessQuestion from "telegraf-stateless-question"
import { addWallet } from "./add.js"
import User, { IUser } from "../models/user.js"
import Wallet, { IWallet } from "../models/wallet.js"
import { linkAddress } from "./info.js"
import { Markup } from "telegraf"

const editWallet = new MenuTemplate(async (ctx: any) => {
  var reply
  var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
  var userWallet: IWallet = user.wallet
  ctx.session.wallet = userWallet
  reply = await ctx.session.wallet.getAccountDetails()
  return reply
})

editWallet.interact("Change address", "r", {
  do: async (ctx: any) => {
    if (!ctx.session.wallet || ctx.session.wallet.balance > 0) {
      editWalletMiddleware.replyToContext(ctx)
      return false
    }
    ctx.session.oldWallet = ctx.session.wallet

    var replyMsg = `Current Address: ${ctx.session.wallet.address}

Enter new ${botParams.settings.network.name} address:`

    enterAddress.replyWithMarkdown(ctx, replyMsg)
    await deleteMenuFromContext(ctx)
    return false
  },
  joinLastRow: true,
  hide: ctx => {
    if (!(ctx.session.wallet) || !(ctx.session.wallet.balance > 0)) {
      return false
    }
    return true
  },
})

editWallet.interact("Cancel", "c", {
  do: async (ctx: any) => {
    await deleteMenuFromContext(ctx)
    return false
  },
  joinLastRow: true,
  hide: ctx => {
    return false
  },
})

const editWalletMiddleware = new MenuMiddleware('wallet/', editWallet)

const enterAddress = new TelegrafStatelessQuestion("adr", async (ctx: any) => {
  var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
  var isValid
  var reply
  try {
    isValid = checkAddress(
      ctx.message.text,
      parseInt(botParams.settings.network.prefix)
    )[0]
  } catch (error) {
    isValid = false
  }
  if (!isValid) {
    await botParams.bot.telegram.sendMessage(user.chat_id, `Incorrect address. Please try again.`)
    ctx.session.oldWallet = null
    addWallet(ctx)
    return
  }
  var newWallet: IWallet = new Wallet({
    address: ctx.message.text,
    balance: "0",
    linked: false,
    password: null,
    password_expiry: null,
    date_of_entry: new Date()
  })
  ctx.session.wallet = newWallet
  var wallet: IWallet = user.wallet
  //user is adding current address again

  if (wallet && wallet.address === newWallet.address && !wallet.linked) {
    //update pword and extend expiry
    user.wallet.setPassword()
  }
  else if (wallet && wallet.address === newWallet.address && wallet.linked) {
    reply = "This address is already linked to your account. Any deposit you make will be " +
      "credited to this account. ALWAYS make sure that your wallet is still linked to your account " +
      "before making a deposit."
    ctx.replyWithMarkdown(
      reply,
      Markup.keyboard(await getKeyboard(ctx)).resize()
    )
    return 
  }
  //user is wishing to add a new wallet address
  else if (wallet && wallet.address != newWallet.address) {
    user.old_wallets.push(wallet)
    user.wallet = newWallet
  }
  console.log("user", user)
  await user.save()
  linkAddress(ctx)
})

export {
  editWalletMiddleware,
  enterAddress
}
