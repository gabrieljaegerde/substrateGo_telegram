import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import _ from "lodash"
import { listCreatedMiddleware } from "./listCreated.js"
import QRCode from "qrcode"
import { Markup } from "telegraf"
import fetch from 'node-fetch'
import { decorateQr } from "../treasureHelpers.js"
import Treasure, { ITreasure } from "../../models/treasure.js"
import Reward, { IReward } from "../../models/reward.js"

const showTreasureMenu = new MenuTemplate(async (ctx: any) => {
    var treasure: ITreasure = await Treasure.findOne({ _id: ctx.session.treasureId, creator: ctx.chat.id })
    var info = `Created on: ${treasure.date_of_entry.toDateString()}. `
    info += treasure.name ? `\nName: ${treasure.name}` : ""
    if (treasure.active) {
        info += `\nStatus: \u2705 (Treasure shown publicly)`
    }
    else {
        info += `\nStatus: \uD83D\uDEAB (Treasure NOT shown publicly)`
    }
    info += `\nMessage to treasure finders: ${treasure.description}`
    var allRewards: Array<IReward> = await Reward.find({ treasure_id: ctx.session.treasureId, collected: true })
    if (allRewards) {
        info += `Treasure has been collected ${allRewards.length} time(s).`
    }
    else {
        info += `This treasure has not been collected yet`
    }
    return info
})

showTreasureMenu.interact("Show NFT", "sN", {
    do: async (ctx: any) => {
        await deleteMenuFromContext(ctx)
        var loadMessage = await botParams.bot.telegram
            .sendMessage(ctx.chat.id, "Loading...")
        let treasure: ITreasure = await Treasure.findOne({ _id: ctx.session.treasureId, creator: ctx.chat.id })
        var response = await fetch(`https://ipfs.io/ipfs/${treasure.file}`)
        let buffer = await response.buffer()
        await botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
        ctx.replyWithMarkdown(
            `Treasure '${treasure.name}' NFT:`,
            Markup.keyboard(await getKeyboard(ctx)).resize()
        )
        await botParams.bot.telegram
            .sendPhoto(ctx.chat.id, { source: buffer })
        listCreatedMiddleware.replyToContext(ctx, `lC/b:${ctx.session.treasureId}/`)
        return false
    },
    joinLastRow: false
})

showTreasureMenu.interact("Show QR", "sQ", {
    do: async (ctx: any) => {
        let treasure: ITreasure = await Treasure.findOne({ _id: ctx.session.treasureId, creator: ctx.chat.id })
        await deleteMenuFromContext(ctx)
        if (treasure) {
            let code = `https://t.me/${botParams.settings.botUsername}?start=` + treasure.code
            let url = await QRCode.toDataURL(code)
            let qrImage = await decorateQr(Buffer.from(url.split(',')[1], 'base64'))
            ctx.replyWithMarkdown(
                `Treasure '${treasure.name}' QR Code:`,
                Markup.keyboard(await getKeyboard(ctx)).resize()
            )
            await botParams.bot.telegram
                .sendPhoto(ctx.chat.id, { source: qrImage })
        }
        listCreatedMiddleware.replyToContext(ctx, `lC/b:${ctx.session.treasureId}/`)
        return false
    },
    joinLastRow: true
})

showTreasureMenu.interact("\uD83C\uDF0D Show location", "eP", {
    do: async (ctx: any) => {
        await deleteMenuFromContext(ctx)
        let treasure: ITreasure = await Treasure.findOne({ _id: ctx.session.treasureId, creator: ctx.chat.id })
        await ctx.replyWithMarkdown(
            `Treasure '${treasure.name}' location:`,
            Markup.keyboard(await getKeyboard(ctx)).resize()
        )
        await botParams.bot.telegram.sendLocation(ctx.chat.id, treasure.location.latitude, treasure.location.longitude)
        listCreatedMiddleware.replyToContext(ctx, `lC/b:${ctx.session.treasureId}/`)
        return false
    },
    joinLastRow: false
})

showTreasureMenu.manualRow(createBackMainMenuButtons())

export {
    showTreasureMenu
}