import { botParams } from "../../config.js"
import _, { StringIterator } from "lodash"
import { editWalletMiddleware, enterAddress } from "./edit.js"
import User, { IUser } from "../models/user.js"

async function addWallet(ctx) {
  var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
  ctx.session.wallet = user.wallet
  if (ctx.session.wallet) {
    editWalletMiddleware.replyToContext(ctx)
  }
  else {
    var reply: string
    reply = "Please enter your wallet address with which you wish to top up " +
      "your account (to pay for minting and transaction fees). Your NFTs will " +
      "also be sent to this address. Each address can only be linked to " +
      "1 telegram account at a time!"
    enterAddress.replyWithMarkdown(ctx, reply)
  }
  return
}

export {
  addWallet
}
