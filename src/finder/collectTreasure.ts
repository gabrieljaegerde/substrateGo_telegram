import { botParams, getKeyboard } from "../../config.js"
import { StatelessQuestion } from "@grammyjs/stateless-question"
import { claimNftMiddleware } from "./menus/claimNftMenu.js"
import { scan } from "../../tools/utils.js"
import Treasure, { ITreasure } from "../models/treasure.js"
import Reward, { IReward } from "../models/reward.js"
import User, { IUser } from "../models/user.js"
import { CustomContext } from "../../types/CustomContext.js"

export const prepareCollection = async (ctx: CustomContext): Promise<boolean> => {
    const session = await ctx.session
    const user: IUser = await User.findOne({ chatId: ctx.chat.id })
    //see if this qr id is registered in the db
    const treasure: ITreasure = await Treasure.findOne({ code: session.code })
    let message
    //qr not registered in db
    if (!treasure) {
        //exit
        message = "The QR Code you tried to scan, either does not belong to this bot, " +
            "or has not been activated yet. If you think that I am mistaken, then please try again.\n\n" +
            "It is likely that I was not able to correctly read the QR code in the last picture. So " +
            "maybe just try sending a new one."
        collectTreasure.replyWithMarkdown(ctx, message)
        return false
    }
    else if (treasure && !treasure.active) {
        //exit
        message = "This treasure has been deactivated by its creator..."
        await ctx.reply(message, {
            reply_markup: {
                keyboard: (await getKeyboard(ctx)).build(),
                resize_keyboard: true
            },
        })
        return false
    }
    //treasure is registered in db
    else {
        const reward: IReward = await Reward.findOne({ treasureId: treasure._id, finder: user.chatId })
        const now = new Date()
        const thirtyAfter = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
        if (reward && reward.collected === true) {
            message = "You already claimed this treasure! You can only claim a treasure once."
            await ctx.reply(message, {
                reply_markup: {
                    keyboard: (await getKeyboard(ctx)).build(),
                    resize_keyboard: true
                },
            })
            return false
        }
        else if (!reward) {
            const newReward: IReward = new Reward({
                treasureId: treasure._id,
                finder: ctx.chat.id,
                collected: false,
                name: treasure.name,
                expiry: thirtyAfter,
                dateCollected: null,
                txHash: null,
                file: null,
            })
            await newReward.save()
        }
        // not collected yet, but rescanned -> move back expiry
        else {
            reward.expiry = thirtyAfter
            await reward.save()
        }
        if (!user.wallet.address || !user.wallet.linked) {
            message = `In order to collect a Treasure, you first need to link a ${botParams.settings.network.name} ` +
                `address to your account. Please go to 'Account settings' ` +
                `in the main menu. ` +
                `\n\n_I have saved this treasure for you and you can still claim it within the next 30 days. ` +
                `To claim it, simply click on '🎁 My treasures' in the Finder menu._`
            await ctx.reply(message, {
                reply_markup: {
                    keyboard: (await getKeyboard(ctx)).build(),
                    resize_keyboard: true
                },
            })
            return false
        }
        return true
    }
}

export const collectTreasure = new StatelessQuestion("ctr", async (ctx: CustomContext) => {
    const session = await ctx.session
    let message
    if (!ctx.message.photo) {
        message = `What you sent me is not a photo. I can only scan photos for QR codes.\n\nPlease send me a single photo (not file).`
        return collectTreasure.replyWithMarkdown(ctx, message)
    }
    if (ctx.message.photo) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1]
        const fileId = photo.file_id
        const file = await ctx.getFile(fileId)
        const url = file.getUrl()
        const result = await scan(url)

        if (result instanceof Error || result === "Error") {
            message = "An error occured when scanning the QR Code. Please send me a new photo."
            return collectTreasure.replyWithMarkdown(ctx, message)
        }
        //remove bot url from qr code content
        const code = result.replace(`https://t.me/${botParams.settings.botUsername}?start=`, "")
        session.code = code
        if (await prepareCollection(ctx)) {
            return claimNftMiddleware.replyToContext(ctx)
        }
    }

})