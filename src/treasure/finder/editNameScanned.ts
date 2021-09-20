import TelegrafStatelessQuestion from "telegraf-stateless-question"
import { botParams, getKeyboard } from "../../../config.js"
import _ from "lodash"
import { Markup } from "telegraf"
import { listScannedMiddleware } from "./listScanned.js"
import { deleteMenuFromContext } from "telegraf-inline-menu"


const editNameScanned = new TelegrafStatelessQuestion("en", async (ctx: any) => {
    //await deleteMenuFromContext(ctx)
    var reply = ""
    if (ctx.message.text) {
        botParams.db.read()
        botParams.db.chain = _.chain(botParams.db.data)
        botParams.db.chain
            .get("scanned")
            .find({ id: ctx.session.scannedId })
            .assign({ name: ctx.message.text })
            .value()
        botParams.db.write()
        reply = "Name updated"
    }
    else {
        reply = "I was not able to edit the name. Please try sending me a text message again."
        return editNameScanned.replyWithMarkdown(ctx, reply)
    }

    await ctx.replyWithMarkdown(
        reply,
        Markup.keyboard(getKeyboard(ctx)).resize()
    )
    listScannedMiddleware.replyToContext(ctx, `lS/lCo/a:${ctx.session.scannedId}/`)
})

export {
    editNameScanned
}