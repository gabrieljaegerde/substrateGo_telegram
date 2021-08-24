import { MenuTemplate, MenuMiddleware, deleteMenuFromContext, createBackMainMenuButtons } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import { fastTrackGet } from "./collectTreasure.js"
import _ from "lodash"

const showNonCollectedItem = new MenuTemplate(async ctx => {
  ctx.session.qrToClaim = ctx.match[1]
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var scannedDb = botParams.db.chain.get("scanned").find({ finder: ctx.chat.id, id: ctx.session.qrToClaim }).value()
  let info = `This treasure will expire on ${scannedDb.expiry}. Claim it before then!`
	return info
})

showNonCollectedItem.interact("Claim", "vnc", {
  do: async ctx => {
    fastTrackGet(ctx, ctx.session.qrToClaim)
    await deleteMenuFromContext(ctx)
    return true
  },
  joinLastRow: true
})

showNonCollectedItem.manualRow(createBackMainMenuButtons())

export {
  showNonCollectedItem
}
