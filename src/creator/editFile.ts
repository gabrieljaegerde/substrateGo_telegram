import { StatelessQuestion } from "@grammyjs/stateless-question"
import { botParams, getKeyboard } from "../../config.js"
import { listCreatedMiddleware } from "./menus/listCreatedMenu.js"
import Jimp from "jimp"
import Treasure, { ITreasure } from "../models/treasure.js"
import { pinSingleFile } from "../../tools/pinataUtils.js"
import { CustomContext } from "../../types/CustomContext.js"

const editFile = new StatelessQuestion("ef", async (ctx: CustomContext) => {
    const session = await ctx.session
    let message = ""
    const loadMessage = await botParams.bot.api.sendMessage(ctx.chat.id, "Loading...")
    const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id })
    let fileId: string
    if (ctx.message.photo) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1]
        fileId = photo.file_id
    }
    else if (ctx.message.document) {
        fileId = ctx.message.document.file_id
        const mimeType = ctx.message.document.mime_type
        const fileName = ctx.message.document.file_name
    }
    else {
        message = "I was not able to edit the NFT. Please try sending me a file again."
        botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
        return editFile.replyWithMarkdown(ctx, message)
    }
    const file = await ctx.getFile(fileId)
    const url = file.getUrl()
    const image = await Jimp.read(url)
    const buffer = await image.getBufferAsync(image._originalMime)
    treasure.file = await pinSingleFile(buffer, `Treasure:${treasure._id}`)
    await treasure.save()
    botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
    message = "NFT updated."
    await ctx.reply(message, {
        reply_markup: {
            keyboard: (await getKeyboard(ctx)).build(),
            resize_keyboard: true
        },
    })
    listCreatedMiddleware.replyToContext(ctx, `lc/b:${session.treasureId}/`)
})

export {
    editFile
}