import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import { Markup } from "telegraf"
import _ from "lodash"
import fetch from 'node-fetch'
import { listScannedMiddleware } from "./listScanned.js"
import { editNameScanned } from "./editNameScanned.js"

const showCollectedItem = new MenuTemplate(async ctx => {
  ctx.session.treasureDb = null
  const qrId = ctx.match[1]
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var scannedDb = botParams.db.chain.get("scanned").find({ finder: ctx.chat.id, id: qrId }).value()
  ctx.sessiontreasureDb = botParams.db.chain.get("qr").find({ id: qrId }).value()
  let info = `You collected this treasure on ${scannedDb.timestampCollected}. `
  //todo: add more info regarding treasure
  return info
})

showCollectedItem.interact("Show NFT", "sN", {
  do: async ctx => {
      botParams.db.read()
      botParams.db.chain = _.chain(botParams.db.data)
      await deleteMenuFromContext(ctx)
      var loadMessage = await ctx.replyWithMarkdown(
          `Loading... \n\nThis can take up to a minute since I am getting your file from a decentralized storage network`,
          Markup.keyboard(getKeyboard(ctx)).resize()
      )
      let treasureDb = botParams.db.chain.get("qrs").find({ id: ctx.session.treasureId, creator: ctx.chat.id }).value()
      
      var response = await fetch(`http://ipfs.io/ipfs/${treasureDb.nft}`)
      let buffer = await response.buffer()
      await botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
      ctx.replyWithMarkdown(
          `Treasure '${treasureDb.name}' NFT:`,
          Markup.keyboard(getKeyboard(ctx)).resize()
      )
      await botParams.bot.telegram
          .sendPhoto(ctx.chat.id, { source: buffer })
      listScannedMiddleware.replyToContext(ctx, `lS/lCo/a:${ctx.session.treasureId}/`)
      return true
  },
  joinLastRow: false
})

showCollectedItem.interact("Edit name", "eN", {
  do: async ctx => {
      //await deleteMenuFromContext(ctx)
      var message = `Please send me the new name.`
      editNameScanned.replyWithMarkdown(ctx, message)
      return true
  },
  joinLastRow: true
})

showCollectedItem.manualRow(createBackMainMenuButtons())

export {
  showCollectedItem
}
