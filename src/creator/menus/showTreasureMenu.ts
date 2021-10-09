import { MenuTemplate, createBackMainMenuButtons, deleteMenuFromContext } from "grammy-inline-menu"
import { InputFile } from "grammy"
import { botParams, getKeyboard } from "../../../config.js"
import { listCreatedMiddleware } from "./listCreatedMenu.js"
import QRCode from "qrcode"
import fetch from 'node-fetch'
import { decorateQr } from "../../../tools/utils.js"
import Treasure, { ITreasure } from "../../models/treasure.js"
import { renderInfo } from "./showCreatedItemMenu.js"
import { CustomContext } from "../../../types/CustomContext.js"

const showTreasureMenu = new MenuTemplate(async (ctx: CustomContext) => {
    const session = await ctx.session
    const text = await renderInfo(ctx, session.treasureId)
    return { text, parse_mode: "Markdown" }
})

showTreasureMenu.interact("Show NFT", "sN", {
    do: async (ctx: CustomContext) => {
        const session = await ctx.session
        await deleteMenuFromContext(ctx)
        const loadMessage = await botParams.bot.api.sendMessage(ctx.chat.id, "Loading...")
        const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id })
        const response: any = await fetch(session.reward.file.replace('ipfs://', 'https://ipfs.io/'))
        const json: any = await response.json()
        await botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
        const message = `Treasure '${treasure.name}' NFT:`
        await ctx.reply(
            message,
            {
                reply_markup: {
                    keyboard: (await getKeyboard(ctx)).build(),
                    resize_keyboard: true
                },
                parse_mode: "Markdown",
            }
        )
        await ctx.replyWithPhoto(json.image.replace('ipfs://', 'https://ipfs.io/'));
        listCreatedMiddleware.replyToContext(ctx, `lc/b:${session.treasureId}/`)
        return false
    },
    joinLastRow: false
})

showTreasureMenu.interact("Show QR", "sQ", {
    do: async (ctx: CustomContext) => {
        const session = await ctx.session
        const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id })
        await deleteMenuFromContext(ctx)
        if (treasure) {
            const code = `https://t.me/${botParams.settings.botUsername}?start=` + treasure.code
            const url = await QRCode.toDataURL(code)
            const qrImage = await decorateQr(Buffer.from(url.split(',')[1], 'base64'))
            const message = `Treasure '${treasure.name}' QR Code:`
            await ctx.reply(message, {
                reply_markup: {
                    keyboard: (await getKeyboard(ctx)).build(),
                    resize_keyboard: true
                },
            })
            await ctx.replyWithPhoto(new InputFile(qrImage))
            //await botParams.bot.api.sendPhoto(ctx.chat.id, { source: qrImage })
        }
        listCreatedMiddleware.replyToContext(ctx, `lc/b:${session.treasureId}/`)
        return false
    },
    joinLastRow: true
})

showTreasureMenu.interact("\uD83C\uDF0D Show location", "eP", {
    do: async (ctx: CustomContext) => {
        const session = await ctx.session
        await deleteMenuFromContext(ctx)
        const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id })
        const message = `Treasure '${treasure.name}' location:`
        await ctx.reply(
            message,
            {
                reply_markup: {
                    keyboard: (await getKeyboard(ctx)).build(),
                    resize_keyboard: true
                },
                parse_mode: "Markdown",
            }
        )
        await botParams.bot.api.sendLocation(ctx.chat.id, treasure.location.latitude, treasure.location.longitude)
        listCreatedMiddleware.replyToContext(ctx, `lc/b:${session.treasureId}/`)
        return false
    },
    joinLastRow: false
})

showTreasureMenu.manualRow(createBackMainMenuButtons())

export {
    showTreasureMenu
}