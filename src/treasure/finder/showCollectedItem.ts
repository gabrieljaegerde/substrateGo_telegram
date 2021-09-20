import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import { Markup } from "telegraf"
import _ from "lodash"
import fetch from 'node-fetch'
import { listScannedMiddleware } from "./listScanned.js"
import { editNameScanned } from "./editNameScanned.js"

const showCollectedItem = new MenuTemplate(async (ctx: any) => {
  ctx.session.treasureDb = null
  ctx.session.scannedId = ctx.match[1]
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  //var scannedDb = botParams.db.chain.get("scanned").find({ id: scannedId }).value()
  ctx.session.scannedDb = botParams.db.chain.get("scanned").find({ id: ctx.session.scannedId }).value()
  var allScannedDb = botParams.db.chain.get("scanned").filter({ qrId: ctx.session.scannedDb.qrId }).value()
  let info = `Name: ${ctx.session.scannedDb.name}\n\nYou collected this ` +
    `treasure on ${new Date(ctx.session.scannedDb.timestampCollected).toDateString()}.\n\n`
  if (allScannedDb) {
    info += `Treasure has been collected by ${allScannedDb.length - 1} others.`
    if (allScannedDb.length == 1) {
      info += `\n\nYour are the ONLY one that has found this treasure so far!`
    }
  }
  //todo: add more info regarding treasure
  return info
})

showCollectedItem.interact("Show NFT", "sN", {
  do: async (ctx: any) => {
    botParams.db.read()
    botParams.db.chain = _.chain(botParams.db.data)
    await deleteMenuFromContext(ctx)
    var loadMessage = await botParams.bot.telegram
      .sendMessage(ctx.chat.id, "Loading...")
    let treasureDb = botParams.db.chain.get("treasures").find({ id: ctx.session.scannedDb.qrId }).value()

    var response = await fetch(`https://ipfs.io/ipfs/${treasureDb.nft}`)
    let buffer = await response.buffer()
    await botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
    ctx.replyWithMarkdown(
      `Treasure '${treasureDb.name}' NFT:`,
      Markup.keyboard(getKeyboard(ctx)).resize()
    )
    await botParams.bot.telegram
      .sendPhoto(ctx.chat.id, { source: buffer })
    console.log("id", ctx.session.scannedId)
    listScannedMiddleware.replyToContext(ctx, `lS/lCo/a:${ctx.session.scannedId}/`)
    return true
  },
  joinLastRow: false
})

showCollectedItem.interact("Show blockchain transaction", "sBT", {
  do: async (ctx: any) => {
    //await deleteMenuFromContext(ctx)
    var links = botParams.settings
      .getExtrinsicLinks(
        botParams.settings.network.name,
        ctx.session.scannedDb.txHash
      )
      .map(row => {
        console.log("row", row)
        return row.map(link => {
          return Markup.button.url(link[0], link[1])
        })
      })
    let message = "What tool would you like to use to view the " +
      "transaction that created this NFT on the blockchain?"
    await botParams.bot.telegram
      .sendMessage(ctx.chat.id, message, Markup.inlineKeyboard(links))
    return true
  },
  joinLastRow: false
})

showCollectedItem.interact("Edit name", "eNS", {
  do: async (ctx: any) => {
    //await deleteMenuFromContext(ctx)
    var message = `Please send me the new name.`
    editNameScanned.replyWithMarkdown(ctx, message)
    return true
  },
  joinLastRow: false
})

showCollectedItem.manualRow(createBackMainMenuButtons())

export {
  showCollectedItem
}
