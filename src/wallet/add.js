import { botParams } from "../../config.js"
import _ from "lodash"
import { editWalletMiddleware, enterAddress } from "./edit.js"


async function addWallet(ctx) {
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
  ctx.session.wallet = user.wallet
  if (ctx.session.wallet.address) {
    editWalletMiddleware.replyToContext(ctx)
  }
  else {
    var reply
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
