import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "telegraf-inline-menu"
import { Markup } from "telegraf"
import { botParams, getKeyboard } from "../../../config.js"

const createTreasureGuide = new MenuTemplate(async (ctx: any) => {
    var step_message = "To complete your treasure's setup, I will need some more info from you.\n\n" +
        "This involves 3 steps:\n\n" +
        `${ctx.session.guideStep == 1 ? "<b>" : ""} ${ctx.session.guideStep == 2 || ctx.session.guideStep == 3 ? "<s>" : ""}` +
        `1. You upload a picture of the treasures QR. ` +
        `${ctx.session.guideStep == 2 || ctx.session.guideStep == 3 ? "</s>" : ""} ${ctx.session.guideStep == 1 ? "</b>" : ""}` + "\n" +
        `${ctx.session.guideStep == 2 ? "<b>" : ""} ${ctx.session.guideStep == 3 ? "<s>" : ""}` +
        `2. You send me the treasures location.` +
        `${ctx.session.guideStep == 3 ? "</s>" : ""} ${ctx.session.guideStep == 2 ? "</b>" : ""}` + "\n" +
        `${ctx.session.guideStep == 3 ? "<b>" : ""} 3. You give the treasure a name. ${ctx.session.guideStep == 3 ? "</b>" : ""}` + "\n"
    return { text: step_message, parse_mode: 'HTML' }
})

createTreasureGuide.interact("Cancel setup", "c", {
    do: async (ctx: any) => {
        await deleteMenuFromContext(ctx)
        ctx.replyWithMarkdown(
            "You have exited the creation mode",
            Markup.keyboard(getKeyboard(ctx)).resize()
        )
        return true
    },
    joinLastRow: true
})

const createTreasureGuideMiddleware = new MenuMiddleware('cTG/', createTreasureGuide)

export {
    createTreasureGuideMiddleware
}