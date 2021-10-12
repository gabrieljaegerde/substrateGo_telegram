import { Router } from '@grammyjs/router'
import type { CustomContext } from '../../types/CustomContext'
import { botParams, cancelCollectInlineKeyboard, getKeyboard, locationKeyboard } from "../../config.js"
import { scan } from "../../tools/utils.js"
//import prom from "./metrics.js"
import Treasure, { ITreasure } from "../models/treasure.js"
import User, { IUser } from "../models/user.js"
import Reward, { IReward } from "../models/reward.js"
import Qr from "../models/qr.js"
import Location from "../models/location.js"
import { claimNftMiddleware } from "./menus/claimNftMenu.js"

export const prepareCollection = async (ctx: CustomContext, code: string) => {
    const session = await ctx.session
    const user: IUser = await User.findOne({ chatId: ctx.chat.id })
    //see if this qr id is registered in the db
    const treasure: ITreasure = await Treasure.findOne({ code: code })
    let message
    //qr not registered in db
    if (!treasure) {
        //exit
        message = "The QR Code you tried to scan, either does not belong to this bot, " +
            "or has not been activated yet. If you think that I am mistaken, then please try again.\n\n" +
            "It is likely that I was not able to correctly read the QR code in the last picture. So " +
            "maybe just try sending a new one."
        await ctx.reply(message, {
            reply_markup: cancelCollectInlineKeyboard, parse_mode: "Markdown"
        })
        return { treasure: null, collectStep: "qr" }

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
        return { treasure: null, collectStep: "" }
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
            return { treasure: null, collectStep: "" }
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
        if (!user.wallet || !user.wallet.address || !user.wallet.linked) {
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
                parse_mode: "Markdown"
            })
            return { treasure: null, collectStep: "" }
        }
        const progressMessage = "Collection Progress:\nQR✅ -> *Confirm Fees*"
        await ctx.reply(
            progressMessage,
            {
                reply_markup: { remove_keyboard: true },
                parse_mode: "Markdown",
            }
        )
        return { treasure: treasure, collectStep: "" }
    }
}

export const router = new Router<CustomContext>(async (ctx: CustomContext) => {
    const session = await ctx.session
    console.log("cstep", session.collectStep)
    return session.collectStep
});

router.route("qr", async (ctx: CustomContext) => {
    const session = await ctx.session
    let message
    if (!ctx.message.photo) {

        message = `What you sent me is not a photo. I can only scan photos for QR codes.\n\nPlease send me a single photo (not file).`
        await ctx.reply(message, {
            reply_markup: cancelCollectInlineKeyboard, parse_mode: "Markdown"
        })
        return
    }
    if (ctx.message.photo) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1]
        const fileId = photo.file_id
        const file = await ctx.getFile(fileId)
        const url = file.getUrl()
        const result = await scan(url)

        if (result instanceof Error || result === "Error") {
            message = "An error occured when scanning the QR Code. Please send me a new photo."
            await ctx.reply(message, {
                reply_markup: cancelCollectInlineKeyboard, parse_mode: "Markdown"
            })
            return
        }
        //remove bot url from qr code content
        const code = result.replace(`https://t.me/${botParams.settings.botUsername}?start=`, "")
        session.code = code
        const { treasure, collectStep } = await prepareCollection(ctx, code)
        console.log("collectsteps", collectStep)
        session.treasure = treasure
        session.collectStep = collectStep
        if (treasure)
            await claimNftMiddleware.replyToContext(ctx)
    }
})
