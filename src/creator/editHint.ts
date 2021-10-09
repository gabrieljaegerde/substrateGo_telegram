import { StatelessQuestion } from "@grammyjs/stateless-question"
import { getKeyboard } from "../../config.js"
import { listCreatedMiddleware } from "./menus/listCreatedMenu.js"
import Treasure, { ITreasure } from "../models/treasure.js"
import { CustomContext } from "../../types/CustomContext.js"

export const editHint = new StatelessQuestion("ehtt", async (ctx: CustomContext) => {
    const session = await ctx.session
    let message = ""
    if (ctx.message.text) {
        const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id })
        treasure.hint = ctx.message.text
        await treasure.save()
        message = "Hint updated"
    }
    else {
        message = "I was not able to edit the name. Please try sending me a text message again."
        return editHint.replyWithMarkdown(ctx, message)
    }

    await ctx.reply(message, {
        reply_markup: {
            keyboard: (await getKeyboard(ctx)).build(),
            resize_keyboard: true
        },
    })
    listCreatedMiddleware.replyToContext(ctx, `lc/b:${session.treasureId}/`)
})
