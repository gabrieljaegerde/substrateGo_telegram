import TelegrafStatelessQuestion from "telegraf-stateless-question"
import { botParams, getKeyboard } from "../../../config.js"
import _ from "lodash"
import { Markup } from "telegraf"
import { listCreatedMiddleware } from "./listCreated.js"
import Treasure, { ITreasure } from "../../models/treasure.js"

const editNameTreasure = new TelegrafStatelessQuestion("eNT", async (ctx: any) => {
    var reply = ""
    if (ctx.message.text) {
        let treasure: ITreasure = await Treasure.findOne({ id: ctx.session.treasureId, creator: ctx.chat.id })
        treasure.name = ctx.message.text
        await treasure.save()
        reply = "Name updated"
    }
    else {
        reply = "I was not able to edit the name. Please try sending me a text message again."
        return editNameTreasure.replyWithMarkdown(ctx, reply)
    }

    await ctx.replyWithMarkdown(
        reply,
        Markup.keyboard(await getKeyboard(ctx)).resize()
    )
    listCreatedMiddleware.replyToContext(ctx, `lC/b:${ctx.session.treasureId}/`)
})

export {
    editNameTreasure
}