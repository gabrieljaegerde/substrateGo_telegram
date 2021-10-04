import TelegrafStatelessQuestion from "telegraf-stateless-question"
import { botParams, getKeyboard } from "../../../config.js"
import _ from "lodash"
import { Markup } from "telegraf"
import { listUserRewardsMiddleware } from "./listUserRewards.js"
import { deleteMenuFromContext } from "telegraf-inline-menu"
import Reward, { IReward } from "../../models/reward.js"

const editNameReward = new TelegrafStatelessQuestion("en", async (ctx: any) => {
    //await deleteMenuFromContext(ctx)
    var reply = ""
    if (ctx.message.text) {
        let reward: IReward = await Reward.findOne({ _id: ctx.session.scannedId })
        reward.name = ctx.message.text
        reward.save()
        reply = "Name updated"
    }
    else {
        reply = "I was not able to edit the name. Please try sending me a text message again."
        return editNameReward.replyWithMarkdown(ctx, reply)
    }

    await ctx.replyWithMarkdown(
        reply,
        Markup.keyboard(await getKeyboard(ctx)).resize()
    )
    listUserRewardsMiddleware.replyToContext(ctx, `lS/lCo/a:${ctx.session.scannedId}/`)
})

export {
    editNameReward
}