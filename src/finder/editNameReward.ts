import { StatelessQuestion } from "@grammyjs/stateless-question"
import { getKeyboard } from "../../config.js"
import { listUserRewardsMiddleware } from "./menus/listUserRewardsMenu.js"
import Reward, { IReward } from "../models/reward.js"
import { CustomContext } from "../../types/CustomContext.js"

const editNameReward = new StatelessQuestion("en", async (ctx: CustomContext) => {
    const session = await ctx.session
    //await deleteMenuFromContext(ctx)
    let message = ""
    if (ctx.message.text) {
        const reward: IReward = await Reward.findOne({_id: session.reward._id})
        reward.name = ctx.message.text
        await reward.save()
        message = "Name updated"
    }
    else {
        message = "I was not able to edit the name. Please try sending me a text message again."
        return editNameReward.replyWithMarkdown(ctx, message)
    }
    await ctx.reply(message, {
        reply_markup: {
            keyboard: (await getKeyboard(ctx)).build(),
            resize_keyboard: true
          },
    })
    listUserRewardsMiddleware.replyToContext(ctx, `lur/lco/a:${session.reward._id}/`)
})

export {
    editNameReward
}