import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import _ from "lodash"
import { listCreatedMiddleware } from "./listCreated.js"
import QRCode from "qrcode"
import { Markup } from "telegraf"
import fetch from 'node-fetch'

const showTreasureMenu = new MenuTemplate(async ctx => {
    botParams.db.read()
    botParams.db.chain = _.chain(botParams.db.data)
    var treasureDb = botParams.db.chain.get("qrs").find({ id: ctx.session.treasureId, creator: ctx.chat.id }).value()
    var info = `Created on: ${treasureDb.timestamp}. `
    info += treasureDb.name ? `\nName: ${treasureDb.name}` : ""
    if (treasureDb.active) {
        info += `\nStatus: \u2705 (Treasure shown publicly)`
    }
    else {
        info += `\nStatus: \uD83D\uDEAB (Treasure NOT shown publicly)`
    }
    info += `\nMessage to treasure finders: ${treasureDb.message}`
    return info
})

showTreasureMenu.interact("Show NFT", "sN", {
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
        listCreatedMiddleware.replyToContext(ctx, `lC/b:${ctx.session.treasureId}/`)
        return true
    },
    joinLastRow: false
})

showTreasureMenu.interact("Show QR", "sQ", {
    do: async ctx => {
        botParams.db.read()
        botParams.db.chain = _.chain(botParams.db.data)
        let treasureDb = botParams.db.chain.get("qrs").find({ id: ctx.session.treasureId, creator: ctx.chat.id }).value()
        await deleteMenuFromContext(ctx)
        if (treasureDb) {
            let code = `https://t.me/${botParams.settings.botUsername}?start=` + treasureDb.id
            let url = await QRCode.toDataURL(code)
            ctx.replyWithMarkdown(
                `Treasure '${treasureDb.name}' QR Code:`,
                Markup.keyboard(getKeyboard(ctx)).resize()
            )
            await botParams.bot.telegram
                .sendPhoto(ctx.chat.id, { source: Buffer.from(url.split(',')[1], 'base64') })//, {caption: caption })

        }
        listCreatedMiddleware.replyToContext(ctx, `lC/b:${ctx.session.treasureId}/`)
        return true
    },
    joinLastRow: true
})

showTreasureMenu.interact("\uD83C\uDF0D Show location", "eP", {
    do: async ctx => {
        botParams.db.read()
        botParams.db.chain = _.chain(botParams.db.data)
        await deleteMenuFromContext(ctx)
        let treasureDb = botParams.db.chain.get("qrs").find({ id: ctx.session.treasureId, creator: ctx.chat.id }).value()
        await ctx.replyWithMarkdown(
            `Treasure '${treasureDb.name}' location:`,
            Markup.keyboard(getKeyboard(ctx)).resize()
        )
        await botParams.bot.telegram.sendLocation(ctx.chat.id, treasureDb.location.latitude, treasureDb.location.longitude)
        listCreatedMiddleware.replyToContext(ctx, `lC/b:${ctx.session.treasureId}/`)
        return true
    },
    joinLastRow: false
})

showTreasureMenu.manualRow(createBackMainMenuButtons())

export {
    showTreasureMenu
}