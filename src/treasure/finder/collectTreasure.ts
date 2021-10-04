import { botParams, getKeyboard } from "../../../config.js"
import { Markup } from "telegraf"
import TelegrafStatelessQuestion from "telegraf-stateless-question"
import _ from "lodash"
import { claimNftMiddleware } from "./claimNft.js"
import { scan } from "../treasureHelpers.js"
import Treasure, { ITreasure } from "../../models/treasure.js"
import Reward, { IReward } from "../../models/reward.js"
import User, { IUser } from "../../models/user.js"

function collectTreasure(ctx) {
    var reply = `Please send me a picture of the treasure's QR Code.`
    return getTreasure.replyWithMarkdown(ctx, reply)
}

async function fastTrackGet(ctx, qrId) {
    var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
    var message
    //see if this qr id is registered in the db
    var treasure : ITreasure = await Treasure.findOne({code: qrId})
    //qr not registered in db
    if (!treasure) {
        //exit
        message = "The QR Code you tried to scan, either does not belong to this bot, " +
            "or has not been activated yet. If you think that I am mistaken, then please try again.\n\n" +
            "It is likely that I was not able to correctly read the QR code in the last picture. So " +
            "maybe just try sending a new one."
        return getTreasure.replyWithMarkdown(ctx, message)
    }
    else if (treasure && !treasure.active) {
        //exit
        message = "This treasure has been deactivated by its creator..."
    }
    //treasure is registered in db
    else {
        ctx.session.qrId = qrId
        var reward: IReward = await Reward.findOne({treasure_id: treasure._id, finder: user.chat_id})
        const now = new Date()
        const thirtyAfter = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
        if (!reward) {
            var newReward: IReward = new Reward({
                treasure_id: treasure._id,
                finder: ctx.chat.id,
                collected: false,
                name: null,
                expiry: thirtyAfter,
                date_collected: null,
                tx_hash: null,
                file: null,
                date_of_entry: now,
            })
            await newReward.save()
            if (!user.wallet.address || !user.wallet.linked) {
                return ctx.replyWithMarkdown(
                    `In order to collect a Treasure, you first need to link a ${botParams.settings.network.name} ` +
                    `address to your account. Please go to 'Account settings' ` +
                    `in the main menu. ` +
                    `\n\n_I have saved this treasure for you and you can still claim it within the next 30 days. ` +
                    `To claim it, simply click on '🎁 My treasures' in the Finder menu._`,
                    Markup.keyboard(await getKeyboard(ctx)).resize()
                )
            }
            return claimNftMiddleware.replyToContext(ctx)
        }
        else {
            if (reward.collected === true) {
                message = "You already claimed this treasure! You can only claim a treasure once."
            }
            // not collected yet, but rescanned -> move back expiry
            else {
                //botParams.db.chain.get("scanned").find({ qrId: qrId, finder: user.chat_id }).assign({ expiry: thirtyAfter }).value()
                reward.expiry = thirtyAfter
                await reward.save()
                if (!user.wallet.address || !user.wallet.linked) {
                    return ctx.replyWithMarkdown(
                        `In order to collect a Treasure, you first need to link a ${botParams.settings.network.name} ` +
                        `address to your account. Please go to 'Account settings' ` +
                        `in the main menu. ` +
                        `\n\nI have saved this treasure for you and you can still claim it within the next 30 days. ` +
                        `To claim it, simply click on '🎁 My treasures' in the Finder menu.`,
                        Markup.keyboard(await getKeyboard(ctx)).resize()
                    )
                }
                return claimNftMiddleware.replyToContext(ctx)
            }
        }
        ctx.session.qrId = null
    }
    ctx.replyWithMarkdown(
        message,
        Markup.keyboard(await getKeyboard(ctx)).resize()
    )
}

//very similar to uploadQR. refactor?
const getTreasure = new TelegrafStatelessQuestion("gt", async (ctx: any) => {
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