import { botParams, getKeyboard } from "../../config.js"
import { Markup } from "telegraf"
import _ from "lodash"
import crypto from "crypto"
import QRCode from "qrcode"
import { decorateQr } from "../treasure/treasureHelpers.js"
import Qr, { IQr } from "../models/qr.js"

async function generateQr(ctx) {
    try {
        do {
            var id = crypto.randomBytes(parseInt(botParams.settings.codeLength)).toString("hex")
            var qr: IQr = await Qr.findOne({ code: id })
        } while (qr)
        let codeLink = `https://t.me/${botParams.settings.botUsername}?start=` + id
        let url = await QRCode.toDataURL(codeLink)
        let qrImage = await decorateQr(Buffer.from(url.split(',')[1], 'base64'))
        let caption = "Go ahead and *print* this sticker now.\n\n_Once you have placed it somewhere, " +
            "click on_ *'💎 Create treasure 💎'* _again " +
            "and move on to_ *Step 2: 'Add Treasure'*_, to link it to a location._"
        //save qr in db
        await new Qr({
            code: id,
            creator: ctx.chat.id,
            date_of_entry: new Date()
        }).save()
        await botParams.bot.telegram
            .sendPhoto(ctx.chat.id, { source: qrImage })
        ctx.replyWithMarkdown(
            caption,
            Markup.keyboard(await getKeyboard(ctx)).resize()
        )
    } catch (err) {
        console.error(err)
    }
}

export {
    generateQr
}