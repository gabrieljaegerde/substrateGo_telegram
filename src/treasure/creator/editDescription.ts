import TelegrafStatelessQuestion from "telegraf-stateless-question"
import { botParams, getKeyboard } from "../../../config.js"
import _ from "lodash"
import { Markup } from "telegraf"
import { listCreatedMiddleware } from "./listCreated.js"
import Treasure, { ITreasure } from "../../models/treasure.js"

const editDescription = new TelegrafStatelessQuestion("ec", async (ctx: any) => {
    var reply = ""
    if (ctx.message.text) {
        let treasure: ITreasure = await Treasure.findOne({ id: ctx.session.treasureId, creator: ctx.chat.id })
        treasure.description = ctx.message.text
        await treasure.save()
        reply = "Message updated"
    }
    else {
        reply = "I was not able to add that message. Please try sending me a text message again."
        return editDescription.replyWithMarkdown(ctx, reply)
    }

    await ctx.replyWithMarkdown(
        reply,
        Markup.keyboard(await getKeyboard(ctx)).resize()
    )
    listCreatedMiddleware.replyToContext(ctx, `lC/b:${ctx.session.treasureId}/`)
})

export {
    editDescription
}

