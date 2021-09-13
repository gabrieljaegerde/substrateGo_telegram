import TelegrafStatelessQuestion from "telegraf-stateless-question"
import { botParams, getKeyboard } from "../../../config.js"
import _ from "lodash"
import { Markup } from "telegraf"
import { listCreatedMiddleware } from "./listCreated.js"

const editMessage = new TelegrafStatelessQuestion("ec", async ctx => {
    var reply = ""
    if (ctx.message.text) {
        botParams.db.read()
        botParams.db.chain = _.chain(botParams.db.data)
        botParams.db.chain
            .get("treasures")
            .find({ id: ctx.session.treasureId, creator: ctx.chat.id })
            .assign({ message: ctx.message.text })
            .value()
        botParams.db.write()
        reply = "Message updated" 
    }
    else {
        reply = "I was not able to add that message. Please try sending me a text message again."
        return editMessage.replyWithMarkdown(ctx, reply)
    }
    
    await ctx.replyWithMarkdown(
        reply,
        Markup.keyboard(getKeyboard(ctx)).resize()
    )
    listCreatedMiddleware.replyToContext(ctx, `lC/b:${ctx.session.treasureId}/`)
})

export {
    editMessage
}

