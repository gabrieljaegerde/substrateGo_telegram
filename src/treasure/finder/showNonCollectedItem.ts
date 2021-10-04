import { MenuTemplate, deleteMenuFromContext, createBackMainMenuButtons } from "telegraf-inline-menu"
import { fastTrackGet } from "./collectTreasure.js"
import _ from "lodash"
import Treasure, { ITreasure } from "../../models/treasure.js"
import Reward, { IReward } from "../../models/reward.js"

const showNonCollectedItem = new MenuTemplate(async (ctx: any) => {
  console.log("ctx.match[1]", ctx.match[1])
  const reward: IReward = await Reward.findOne({ _id: ctx.match[1], finder: ctx.chat.id })
  const treasure: ITreasure = await Treasure.findOne({_id: reward.treasure_id})
  ctx.session.treasureToClaim = treasure.code
  let info = `This treasure (${reward.name}) will expire on ${reward.expiry.toDateString()}. Claim it before then!`
	return info
})

showNonCollectedItem.interact("Claim", "vnc", {
  do: async (ctx: any) => {
    fastTrackGet(ctx, ctx.session.treasureToClaim)
    await deleteMenuFromContext(ctx)
    return true
  },
  joinLastRow: true
})

showNonCollectedItem.manualRow(createBackMainMenuButtons())

export {
  showNonCollectedItem
}
