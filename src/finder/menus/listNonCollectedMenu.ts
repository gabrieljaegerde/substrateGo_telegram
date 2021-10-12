import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons } from "grammy-inline-menu"
import _ from "lodash"
import { showNonCollectedItem } from "./showNonCollectedItemMenu.js"
import Reward, { IReward } from "../../models/reward.js"
import { CustomContext } from "../../../types/CustomContext.js"

const listNonCollected = new MenuTemplate(async (ctx: CustomContext) => {
  const session = await ctx.session
  const userNonCollectedRewards: Array<IReward> = await Reward.find({
    finder: ctx.chat.id,
    collected: false,
    expiry: { $gt: new Date() }
  })
  const userNonCollectedRewardsOrdered = _.orderBy(userNonCollectedRewards, ["dateCollected"], ["asc"])
  session.userNonCollectedRewards = userNonCollectedRewardsOrdered
  if (!session.userNonCollectedRewards || session.userNonCollectedRewards.length === 0)
    return `You don't have any non-collected treasures.`
  return `Here are all your non-collected treasures... Claim them now before they expire (30 days after scan)!`
})

listNonCollected.chooseIntoSubmenu(
  "a",
  async (ctx: any) => {
    const session = await ctx.session
    if (!session.userNonCollectedRewards || session.userNonCollectedRewards.length === 0)
      return ""
    return session.userNonCollectedRewards.map((reward: IReward) =>
      reward._id
    )
  },
  showNonCollectedItem,
  {
    hide: async (ctx) => {
      const session = await ctx.session
      if (
        !session ||
        !session.userNonCollectedRewards ||
        session.userNonCollectedRewards.length === 0
      )
        return true
      return false
    },
    buttonText: async (ctx: CustomContext, key) => {
      const session = await ctx.session
      if (key === "")
        return
      let text = ""
      const reward: IReward = session.userNonCollectedRewards.find((reward: IReward) => reward._id.equals(key))
      const dayInMs = 1000 * 60 * 60 * 24
      if ((reward.expiry.getTime() - new Date().getTime()) < (3 * dayInMs)) {
        text = `\u26A0 ${reward.createdAt.toDateString()} - ${reward.name} \u26A0`
      }
      else {
        text = `${reward.createdAt.toDateString()} - ${reward.name}`
      }
      return text
    },
    maxRows: 5,
    columns: 1,
    getCurrentPage: async (ctx) => {
      const session = await ctx.session
      return session.nonCollectedRewardsPage
    },
    setPage: async (ctx, page) => {
      const session = await ctx.session
      session.nonCollectedRewardsPage = page
    },
  }
)

listNonCollected.manualRow(createBackMainMenuButtons())

const listNonCollectedMiddleware = new MenuMiddleware('lnco/', listNonCollected)

export {
  listNonCollected,
  listNonCollectedMiddleware
}
