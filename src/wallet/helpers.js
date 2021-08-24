import _ from "lodash"
import { botParams } from "../../config.js"
import { balanceToString } from "../../tools/typeParser.js"

async function setSessionWallet(ctx){
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
  ctx.session.wallet = user.wallet
}

async function getAccountDetails(wallet){
  let { value, tokenString } = await balanceToString(wallet.balance)
  return `Address: ${wallet.address}\n\nBalance: ${value} ${tokenString}`
}

export {
  getAccountDetails,
  setSessionWallet
}
