import TelegrafStatelessQuestion from "telegraf-stateless-question"
import { botParams, getKeyboard } from "../../../config.js"
import _ from "lodash"
import { Markup } from "telegraf"
import { listScannedMiddleware } from "../finder/listScanned.js"

const editNameTreasure = new TelegrafStatelessQuestion("en", async ctx => {
    var reply = ""
    if (ctx.message.text) {
        botParams.db.read()
        botParams.db.chain = _.chain(botParams.db.data)
        botParams.db.chain
            .get("qrs")
            .find({ id: ctx.session.treasureId, creator: ctx.chat.id })
            .assign({ name: ctx.message.text })
            .value()
        botParams.db.write()
        reply = "Name updated"
    }
    else {
        reply = "I was not able to edit the name. Please try sending me a text message again."
        return editNameTreasure.replyWithMarkdown(ctx, reply)
    }

    ctx.replyWithMarkdown(
        reply,
        Markup.keyboard(getKeyboard(ctx)).resize()
    )
    listScannedMiddleware.replyToContext(ctx, `lS/lCo/a:${ctx.session.treasureId}/`)
})

export {
    editNameTreasure
}