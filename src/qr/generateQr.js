import { botParams, getKeyboard } from "../../config.js"
import { Markup } from "telegraf"
import _ from "lodash"
import crypto from "crypto"
import QRCode from "qrcode"
import { decorateQr } from "../treasure/helpers.js"

async function generateQr(ctx) {
    try {
        botParams.db.read()
        botParams.db.chain = _.chain(botParams.db.data)
        do {
            var id = crypto.randomBytes(parseInt(botParams.settings.codeLength)).toString("hex")
            var genQrDb = botParams.db.chain.get("generated_qrs").find({ id: id }).value()
        } while (genQrDb)
        let code = `https://t.me/${botParams.settings.botUsername}?start=` + id
        let url = await QRCode.toDataURL(code)
        let qrImage = await decorateQr(Buffer.from(url.split(',')[1], 'base64'))
        console.log("qrImage", qrImage)
        let caption = "Go ahead and print this sticker now. Once you have hid it, " +
            "click on '\uD83D\uDC8E Create treasure \uD83D\uDC8E' again " +
            "and move on to Step 2: 'Add Treasure', to link it to a location."
        //save genqr in db
        var new_gen_qr = {
            id: id,
            creator: ctx.chat.id,
            timestamp: new Date()
        }
        botParams.db.read()
        botParams.db.chain = _.chain(botParams.db.data)
        botParams.db.chain.get("generated_qrs").push(new_gen_qr).value()
        console.log("new_gen_qr", new_gen_qr)

        botParams.db.write()
        //await botParams.bot.telegram
        //  .sendPhoto(ctx.chat.id, { source: buffer })
        await botParams.bot.telegram
            .sendPhoto(ctx.chat.id, { source: qrImage })//, {caption: caption })
        ctx.replyWithMarkdown(
            caption,
            Markup.keyboard(getKeyboard(ctx)).resize()
        )
    } catch (err) {
        console.error(err)
    }
}

export {
    generateQr
}