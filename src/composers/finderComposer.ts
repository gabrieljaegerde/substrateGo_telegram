import { Composer } from "grammy"
import { CustomContext } from "../../types/CustomContext.js"
import { botParams, getKeyboard } from "../../config.js"
//import prom from "./metrics.js"
import Treasure, { ITreasure } from "../models/treasure.js"
import { resetSession, asyncFilter, distance } from "../../tools/utils.js"
import { collectTreasure } from "../finder/collectTreasure.js"
import { listUserRewardsMiddleware } from "../finder/menus/listUserRewardsMenu.js"
import Location, { ILocation } from "../models/location.js"
import { editNameReward } from "../finder/editNameReward.js"
import { claimNftMiddleware } from "../finder/menus/claimNftMenu.js"
import { listCollectedMiddleware } from "../finder/menus/listCollectedMenu.js"
import { listNonCollectedMiddleware } from "../finder/menus/listNonCollectedMenu.js"

export const finderComposer = new Composer<CustomContext>()

/*
 *   React bot on 'Collect treasure' message
 */

finderComposer.hears("📷 Collect treasure", async (ctx) => {
    if (ctx.chat.type == "private") {
        await resetSession(ctx)
        const reply = `Please send me a picture of the treasure's QR Code.`
        return collectTreasure.replyWithMarkdown(ctx, reply)
    }
})

/*
 *   React bot on 'My treasures' message
 */

finderComposer.hears("🎁 My treasures", async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
        await resetSession(ctx)
        listUserRewardsMiddleware.replyToContext(ctx)
    }
})

/*
 *   React bot on 'Finder Mode' message
 */

finderComposer.hears("🕵🏾‍♂️ Finder Mode", async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
        await resetSession(ctx)
        const session = await ctx.session
        session.menu = "finder"
        const message = "You have entered 🕵🏾‍♂️ *finder* mode.\n\nHere you can:\n• *collect* treasures 📷\n" +
            "• *find* treasures 🔍\n• and *view* your found treasures 🎁\n\n_Each time you collect a treasure, " +
            `an NFT gets created on the ${botParams.settings.network.name} blockchain. These prove your ownership of ` +
            "the treasures and can be freely traded on the open market._"
        await ctx.reply(
            message,
            {
                reply_markup: {
                    keyboard: (await getKeyboard(ctx)).build(),
                    resize_keyboard: true
                },
                parse_mode: "Markdown",
            }
        )
    }
})

/*
 *   React bot on 'Find treasures' button press
 */

finderComposer.on("message:location", async (ctx) => {
    if (ctx.chat.type == "private") {
        const session = await ctx.session
        //do some check here if its really mean to be find location
        //location sent to find closest treasure
        if (ctx.message.location) {
            const loadMessage = await botParams.bot.api.sendMessage(ctx.chat.id, "Loading...")
            const allTreasures: Array<ITreasure> = await Treasure.find({ active: true })


            const nonCollected: Array<ITreasure> = await asyncFilter(allTreasures, async (treasure: ITreasure) => {
                const collected: boolean = await treasure.checkIfAlreadyCollected(ctx.chat.id)
                return !collected
            })

            if (nonCollected.length < 1) {
                const message = "You have collected all existing Treasures already!"
                await ctx.reply(
                    message,
                    {
                        reply_markup: {
                            keyboard: (await getKeyboard(ctx)).build(),
                            resize_keyboard: true
                        },
                        parse_mode: "Markdown",
                    }
                )
                await botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
                return
            }
            const userLocation: ILocation = new Location(ctx.message.location)
            const nearest: ITreasure = nonCollected.reduce(function (prev, curr) {
                const prevDistance = distance(userLocation, prev.location, "K"),
                    currDistance = distance(userLocation, curr.location, "K")
                return (prevDistance < currDistance) ? prev : curr
            })
            const message = `The closest treasure (not collected by you yet) is ` +
                `*${Math.round(distance(userLocation, nearest.location, "K") * 100) / 100}km* away.\n\n` +
                `This treasure has been collected by *${await nearest.howManyCollected()}* others so far.\n\n` +
                `Hint: *${nearest.hint}*\n\n` +
                `Treasure *${nearest.name}'s* location:`
            await ctx.reply(
                message,
                {
                    reply_markup: {
                        keyboard: (await getKeyboard(ctx)).build(),
                        resize_keyboard: true
                    },
                    parse_mode: "Markdown",
                }
            )
            await botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
            await botParams.bot.api.sendLocation(ctx.chat.id, nearest.location.latitude, nearest.location.longitude)
        }
        else {
            const message = "The location you sent me was invalid. " +
                "Please try again."
            await ctx.reply(
                message,
                {
                    reply_markup: {
                        keyboard: (await getKeyboard(ctx)).build(),
                        resize_keyboard: true
                    },
                    parse_mode: "Markdown",
                }
            )
            return
        }
    }
})

finderComposer.use(editNameReward.middleware())

finderComposer.use(collectTreasure.middleware())

finderComposer.use(listCollectedMiddleware)

finderComposer.use(listUserRewardsMiddleware)

finderComposer.use(listNonCollectedMiddleware)

finderComposer.use(claimNftMiddleware)

