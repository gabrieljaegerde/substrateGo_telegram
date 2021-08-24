import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import { listCollected } from "./listCollected.js"
import { listNonCollected } from "./listNonCollected.js"
import _ from "lodash"

const listScanned = new MenuTemplate(async ctx => {
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var reply = ""
  var userScanned = botParams.db.chain.get("scanned").filter({ finder: ctx.chat.id }).value()
  var userCollected = _.chain(userScanned)
    .filter(item => item.collected === true)
    .orderBy(["timestampCollected"],["desc"]).value()
  ctx.session.userCollected = userCollected
  var userNonCollected = _.chain(userScanned)
    .filter(item => item.collected === false && new Date(item.expiry) > new Date())
    .orderBy(["timestamp"],["asc"]).value()
  ctx.session.userNonCollected = userNonCollected
  if (userCollected.length > 0){
    reply += `You have collected a total of ${userCollected.length} treasures.\n\n`
  }
  if (userNonCollected.length > 0){
    reply += `${userNonCollected.length} treasures have not been claimed by you yet ` +
      `and might expire soon! Claim them before it's too late!`
  }
  reply = reply ? reply : "You have no treasures yet."

  return reply
})

listScanned.submenu('View collected', 'lCo', listCollected, {
  hide: ctx => !ctx.session.userCollected.length > 0
})

listScanned.submenu('View non-collected', 'lNC', listNonCollected, {
  hide: ctx => !ctx.session.userNonCollected.length > 0
})

const listScannedMiddleware = new MenuMiddleware('lS/', listScanned)

export {
  listScannedMiddleware
}
