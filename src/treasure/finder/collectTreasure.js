import { botParams, getKeyboard } from "../../../config.js"
import { Markup } from "telegraf"
import TelegrafStatelessQuestion from "telegraf-stateless-question"
import _ from "lodash"
import { claimNftMiddleware } from "../../nft/claimNft.js"
import { scan } from "../helpers.js"

function collectTreasure(ctx) {
    var reply = `Please send me a picture of the treasure's QR Code.`
    return getTreasure.replyWithMarkdown(ctx, reply)
}

function fastTrackGet(ctx, qrId) {
    botParams.db.read()
    botParams.db.chain = _.chain(botParams.db.data)
    var user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
    var message
    //see if this qr id is registered in the db
    var qrDb = botParams.db.chain.get("treasures").find({ id: qrId }).value()
    //qr not registered in db
    if (!qrDb) {
        //exit
        message = "The QR Code you tried to scan, either does not belong to this bot, " +
            "or has not been activated yet. If you think that I am mistaken, then please try again.\n\n" +
            "It is likely that I was not able to correctly read the QR code in the last picture. So " +
            "maybe just try sending a new one."
        return getTreasure.replyWithMarkdown(ctx, message)
    }
    else if (qrDb && !qrDb.active) {
        //exit
        message = "This treasure has been deactivated by its creator..."
    }
    //qr is registered in db
    else {
        ctx.session.remark = qrDb.remark
        ctx.session.qrId = qrId
        ctx.session.user = user
        var scannedDb = botParams.db.chain.get("scanned").find({ qrId: qrId, finder: user.chatid }).value()
        ctx.session.scannedDb = scannedDb
        const now = new Date()
        const thirtyAfter = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
        if (!scannedDb) {
            var new_scanned = {
                id: qrId.substring(0,10) + ctx.chat.id + now.getTime(),
                qrId: qrId,
                finder: ctx.chat.id,
                collected: false,
                name: qrDb.name,
                timestamp: now,
                expiry: thirtyAfter,
                timestampCollected: null,
                txHash: null,
                nft: qrDb.nft
            }
            botParams.db.chain.get("scanned").push(new_scanned).value()
            botParams.db.write()
            if (!user.wallet.address || !user.wallet.linked) {
                return ctx.replyWithMarkdown(
                    `In order to collect a Treasure, you first need to link a ${botParams.settings.network.name} ` +
                    `address to your account. Please go to 'Account settings' ` +
                    `in the main menu. ` +
                    `\n\n_I have saved this treasure for you and you can still claim it within the next 30 days. ` +
                    `To claim it, simply click on '🎁 My treasures' in the Finder menu._`,
                    Markup.keyboard(getKeyboard(ctx)).resize()
                )
            }
            return claimNftMiddleware.replyToContext(ctx)
        }
        else {
            if (scannedDb.collected === true) {
                message = "You already claimed this treasure! You can only claim a treasure once."
            }
            // not collected yet, but rescanned -> move back expiry
            else {
                botParams.db.chain.get("scanned").find({ qrId: qrId, finder: user.chatid }).assign({ expiry: thirtyAfter }).value()
                botParams.db.write()
                if (!user.wallet.address || !user.wallet.linked) {
                    return ctx.replyWithMarkdown(
                        `In order to collect a Treasure, you first need to link a ${botParams.settings.network.name} ` +
                        `address to your account. Please go to 'Account settings' ` +
                        `in the main menu. ` +
                        `\n\nI have saved this treasure for you and you can still claim it within the next 30 days. ` +
                        `To claim it, simply click on '🎁 My treasures' in the Finder menu.`,
                        Markup.keyboard(getKeyboard(ctx)).resize()
                    )
                }
                return claimNftMiddleware.replyToContext(ctx)
            }
        }
        ctx.session.remark = null
        ctx.session.qrId = null
        ctx.session.user = null
    }
    ctx.replyWithMarkdown(
        message,
        Markup.keyboard(getKeyboard(ctx)).resize()
    )
}

//very similar to uploadQR. refactor?
const getTreasure = new TelegrafStatelessQuestion("gt", async ctx => {
    if (ctx.message.photo) {
        let photo = ctx.message.photo[ctx.message.photo.length - 1]
        let fileId = photo.file_id
        let file = await ctx.telegram.getFile(fileId)
        let url = await ctx.telegram.getFileLink(file.file_id)
        var result = await scan(url.href)

        if (result instanceof Error) {
            message = "An error occured when scanning the QR Code. Please send me a new photo."
            return getTreasure.replyWithMarkdown(ctx, message)
        }
        //remove bot url from qr code content
        var qrId = result.replace(`https://t.me/${botParams.settings.botUsername}?start=`, "")
        fastTrackGet(ctx, qrId)
    }
    else {
        var message = `What you sent me is not a photo. I can only scan photos for QR codes.\n\nPlease send me a single photo (not file).`
        return getTreasure.replyWithMarkdown(ctx, message)
    }
})

export {
    collectTreasure,
    fastTrackGet,
    getTreasure
}