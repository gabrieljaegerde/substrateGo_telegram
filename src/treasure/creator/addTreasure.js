import { botParams, getKeyboard } from "../../../config.js"
import { Markup } from "telegraf"
import TelegrafStatelessQuestion from "telegraf-stateless-question"
import _ from "lodash"
import { scan } from "../helpers.js"
import { createTreasureGuideMiddleware } from "./createTreasureGuide.js"

async function addTreasure(ctx) {
    ctx.session.guideStep = 1
    ctx.session.guideMessage = await createTreasureGuideMiddleware.replyToContext(ctx)
    console.log("get", ctx.session.guideMessage)
    /*
    var step_message = "To complete your treasure's setup, I will need some more info from you.\n\n" +
        "This involves 3 steps:\n\n" +
        "*1. You upload a picture of the treasures QR.* <- current step\n" +
        "2. You send me the treasures location.\n" +
        "3. You give the treasure a name.\n\n"
    await botParams.bot.telegram.sendMessage(ctx.chat.id, step_message, { parse_mode: "Markdown" })*/
    var reply = `Please send me a picture of the QR Code you wish to add.`
    return uploadQr.replyWithMarkdown(ctx, reply)
}

const uploadQr = new TelegrafStatelessQuestion("qr", async ctx => {
    botParams.db.read()
    botParams.db.chain = _.chain(botParams.db.data)
    var user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
    var message
    if (!ctx.session.qr) {
        if (ctx.message.photo && ctx.session.guideStep == 1) {
            let photo = ctx.message.photo[ctx.message.photo.length - 1]
            let fileId = photo.file_id
            let file = await ctx.telegram.getFile(fileId)
            let url = await ctx.telegram.getFileLink(file.file_id)
            var result = await scan(url.href)
            if (result instanceof Error || result == "Couldn't find enough alignment patterns") {
                message = "An error occured when scanning the QR Code. Please send me a new photo."
                return uploadQr.replyWithMarkdown(ctx, message)
            }
            var qrId = result.replace(`https://t.me/${botParams.settings.botUsername}?start=`, "")
            let qrDb = botParams.db.chain.get("qrs").find({ id: qrId }).value()
            let genQrDb = botParams.db.chain.get("generated_qrs").find({ id: qrId }).value()
            if (!qrDb && genQrDb) {
                var newQr = {
                    id: qrId,
                    location: {},
                    creator: ctx.chat.id,
                    active: true,
                    timestamp: new Date(),
                    name: "",
                    message: "Congrats on finding this Treasure!",
                    nft: botParams.settings.defaultNft
                }
                ctx.session.qr = newQr
                await botParams.bot.telegram.deleteMessage(ctx.session.guideMessage.chat.id, ctx.session.guideMessage.message_id)
                ctx.session.guideStep = 2
                ctx.session.guideMessage = await createTreasureGuideMiddleware.replyToContext(ctx)
                message = "Please now send me the location of the treasure.\n\nThis cannot " +
                    "be changed later so make sure you only set it once the treasure is " +
                    "placed in its final location. To add the location, click on the '\uD83D\uDCCE' below " +
                    "and then click on 'Location'.\n\nIf the treasure is hidden at your current location, simply " +
                    "click on 'Send My Current Location'. Otherwise drag the map so that the marker points to " +
                    "the treasures location. Then click 'Send selected location'."
                return uploadQr.replyWithMarkdown(ctx, message)
            }
            else if (qrDb) {
                message = "This QR Code is already registered."
            }
            else {
                message = "Only QR Codes generated by this bot can be added. " +
                    "Click on 'Generate QR Code' in the menu below if you did not generate one yet. " +
                    "It is also possible that I just didn't read the QR code in the picture properly. " +
                    "If you think that is the case, then please send me a new picture of it."
                ctx.session.qr = null
                return uploadQr.replyWithMarkdown(ctx, message)
            }
            ctx.replyWithMarkdown(
                message,
                Markup.keyboard(getKeyboard(ctx)).resize()
            )
        }
        else {
            message = `What you sent me is not a photo. I can only scan photos for QR codes.\n\nPlease send me a single photo (not file).`
            ctx.session.qr = null
            return uploadQr.replyWithMarkdown(ctx, message)
        }
    }
    else if (ctx.session.qr && _.isEmpty(ctx.session.qr.location)) {
        if (ctx.message.location && ctx.session.guideStep == 2) {
            ctx.session.qr.location = ctx.message.location
            await botParams.bot.telegram.deleteMessage(ctx.session.guideMessage.chat.id, ctx.session.guideMessage.message_id)
            ctx.session.guideStep = 3
            ctx.session.guideMessage = await createTreasureGuideMiddleware.replyToContext(ctx)
            message = `To make it easier for you and others to identify this treasure, please now give it a descriptive name.`
            return uploadQr.replyWithMarkdown(ctx, message)
        }
        else {
            message = "The location you sent me was invalid. " +
                "Please try again. Send me the location of the marker " +
                "the same way you would send your current location to your friends..."
            return uploadQr.replyWithMarkdown(ctx, message)
        }
    }
    else {
        if (ctx.message.text && ctx.session.guideStep == 3) {
            ctx.session.qr.name = ctx.message.text
            botParams.db.chain.get("qrs").push(ctx.session.qr).value()
            botParams.db.write()
            ctx.session.qr = null
            var reply = "Treasure has been successfully added with the BASIC settings.\n\n" +
                "You can always go and spice up your treasures by hitting 'Edit treasure' in the menu!"
            ctx.replyWithMarkdown(
                reply,
                Markup.keyboard(getKeyboard(ctx)).resize()
            )
        }
        else {
            message = "The name you sent me was invalid. " +
                "Please try again. Just send me a text message with the name in it please."
            return uploadQr.replyWithMarkdown(ctx, message)
        }
    }
})

export {
    addTreasure,
    uploadQr,
}