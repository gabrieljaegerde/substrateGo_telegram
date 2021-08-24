import TelegrafStatelessQuestion from "telegraf-stateless-question"
import { botParams, getKeyboard } from "../../config.js"
import _ from "lodash"
import { Markup } from "telegraf"
import { listCreatedMiddleware } from "../treasure/creator/listCreated.js"
import { Readable } from "stream"
import Jimp from "jimp"

const editNFT = new TelegrafStatelessQuestion("eNF", async ctx => {
    var reply = ""
    var loadMessage = await ctx.replyWithMarkdown(
        `Loading...`,
        Markup.keyboard(getKeyboard(ctx)).resize()
    )
    console.log(ctx.message)
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
        return editNFT.replyWithMarkdown(ctx, message)
    }

    let file = await ctx.telegram.getFile(fileId)
    console.log("file", file)
    let url = await ctx.telegram.getFileLink(file.file_id)
    console.log("url", url)
    var image = await Jimp.read(url.href)
    console.log("image", image)
    var buffer = await image.getBufferAsync(image._originalMime)
    console.log("buffer", buffer)
    var stream = Readable.from(buffer)
    console.log("stream", stream)
    //var stream = Readable.from(image.bitmap.data)
    stream.path = "some_filename.png"
    const options = {
        pinataMetadata: {
            name: fileName ? fileName : 'MyCustomName',
            keyvalues: {
                customKey: 'customValue',
                customKey2: 'customValue2'
            }
        },
        pinataOptions: {
            cidVersion: 0
        }
    }
    try {
        var result = await botParams.pinata.pinFileToIPFS(stream, options)
        console.log("success", result)
    }
    catch (err) {
        console.log("error", err)
    }


    botParams.db.chain
        .get("qrs")
        .find({ id: ctx.session.treasureId, creator: ctx.chat.id })
        .assign({ nft: result.IpfsHash })
        .value()
    botParams.db.write()
    console.log(loadMessage)
    botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)

    reply = "NFT updated"

    ctx.replyWithMarkdown(
        reply,
        Markup.keyboard(getKeyboard(ctx)).resize()
    )
    listCreatedMiddleware.replyToContext(ctx, `lC/b:${ctx.session.treasureId}/`)
})

export {
    editNFT
}