import { MenuTemplate, deleteMenuFromContext, createBackMainMenuButtons } from "grammy-inline-menu"
import { prepareCollection } from "../collectTreasure.js"
import Treasure, { ITreasure } from "../../models/treasure.js"
import Reward, { IReward } from "../../models/reward.js"
import { claimNftMiddleware } from "./claimNftMenu.js"
import { CustomContext } from "../../../types/CustomContext.js"

const showNonCollectedItem = new MenuTemplate(async (ctx: CustomContext) => {
  const session = await ctx.session
  const reward: IReward = await Reward.findOne({ _id: ctx.match[1], finder: ctx.chat.id })
  const treasure: ITreasure = await Treasure.findOne({ _id: reward.treasureId })
  session.code = treasure.code
  const info = `This treasure (${reward.name}) will expire on ${reward.expiry.toDateString()}. Claim it before then!`
  return info
})

showNonCollectedItem.interact("Claim", "vnc", {
  do: async (ctx: CustomContext) => {
    const session = await ctx.session
    await deleteMenuFromContext(ctx)
    const { treasure, collectStep } = await prepareCollection(ctx, session.code)
    session.treasure = treasure
    session.collectStep = collectStep
    if (treasure)
      await claimNftMiddleware.replyToContext(ctx)
    return false
  },
  joinLastRow: true
})

showNonCollectedItem.manualRow(createBackMainMenuButtons())

export {
  showNonCollectedItem
}
