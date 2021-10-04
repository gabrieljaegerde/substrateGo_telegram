import TelegrafStatelessQuestion from "telegraf-stateless-question"
import { botParams, getKeyboard } from "../../../config.js"
import _ from "lodash"
import { Markup } from "telegraf"
import { listCreatedMiddleware } from "./listCreated.js"
import { Readable } from "stream"
import Jimp from "jimp"
import Treasure, { ITreasure } from "../../models/treasure.js"
import { pinSingleFile, pinSingleMetadata } from "../../../tools/pinataUtils.js"

const editFile = new TelegrafStatelessQuestion("eF", async (ctx: any) => {
    var reply = ""
    var loadMessage = await botParams.bot.telegram
        .sendMessage(ctx.chat.id, "Loading...")
    let treasure: ITreasure = await Treasure.findOne({ _id: ctx.session.treasureId, creator: ctx.chat.id })
    if (ctx.message.photo) {
        let photo = ctx.message.photo[ctx.message.photo.length - 1]
        var fileId = photo.file_id
    }
    else if (ctx.message.document) {
        var fileId = ctx.message.document.file_id
        var mimeType = ctx.message.document.mime_type
        var fileName = ctx.message.document.file_name
    }
    else {
        reply = "I was not able to edit the NFT. Please try sending me a file again."
        botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
        return editFile.replyWithMarkdown(ctx, reply)
    }

    let file = await ctx.telegram.getFile(fileId)
    let url = await ctx.telegram.getFileLink(file.file_id)
    var image = await Jimp.read(url.href)
    var buffer = await image.getBufferAsync(image._originalMime)
    treasure.file = await pinSingleFile(buffer, `Treasure:${treasure._id}`)
    await treasure.save()
    botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
    reply = "NFT updated"
    ctx.replyWithMarkdown(
        reply,
        Markup.keyboard(await getKeyboard(ctx)).resize()
    )
    listCreatedMiddleware.replyToContext(ctx, `lC/b:${ctx.session.treasureId}/`)
})

export {
    editFile
}