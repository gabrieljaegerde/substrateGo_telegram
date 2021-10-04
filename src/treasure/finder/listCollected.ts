import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons } from "telegraf-inline-menu"
import _ from "lodash"
import { showCollectedItem } from "./showCollectedItem.js"
import Reward, { IReward } from "../../models/reward.js"

const listCollected = new MenuTemplate(async (ctx: any) => {
  console.log("in here")
  var userRewards: Array<IReward> = await Reward.find({ finder: ctx.chat.id })
  var userCollectedRewards = _.chain(userRewards)
    .filter((reward: IReward) => reward.collected === true)
    .orderBy(["date_collected"], ["desc"]).value()
  console.log("ctx3", ctx.update.update_id)
  console.log("userCollectedRewards2", userCollectedRewards.length)
  ctx.session.userCollectedRewards = userCollectedRewards
  console.log("ctx.session.userCollectedRewards2", ctx.session.userCollectedRewards.length)
  return `Here are all your collected treasures sorted by newest:`
})

listCollected.chooseIntoSubmenu(
  "a",
  ctx => {
    if (!ctx.session.userCollectedRewards || ctx.session.userCollectedRewards.length === 0)
      return ""
    return ctx.session.userCollectedRewards.map((reward: IReward) =>
      reward._id
    )
  },
  showCollectedItem,
  {
    hide: ctx => {
      if (
        !ctx.session ||
        !ctx.session.userCollectedRewards ||
        ctx.session.userCollectedRewards.length == 0
      ) {
        return true
      }
      return false
    },
    maxRows: 5,
    columns: 1,
    buttonText: (ctx, key) => {
      if (key === "")
        return
      return ctx.session.userCollectedRewards.find((reward: IReward) => reward._id.equals(key)).name
    },
    getCurrentPage: ctx => ctx.session.collectedPage,
    setPage: (ctx, page) => {
      ctx.session.collectedPage = page
    },
  }
)

listCollected.manualRow(createBackMainMenuButtons())

const listCollectedMiddleware = new MenuMiddleware('lco/', listCollected)

export {
  listCollected,
  listCollectedMiddleware
}
