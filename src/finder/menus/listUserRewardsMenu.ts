import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "grammy-inline-menu"
import { listCollected } from "./listCollectedMenu.js"
import { listNonCollected } from "./listNonCollectedMenu.js"
import _ from "lodash"
import Reward, { IReward } from "../../models/reward.js"
import { CustomContext } from "../../../types/CustomContext.js"

const listUserRewards = new MenuTemplate(async (ctx: CustomContext) => {
  const session = await ctx.session
  let reply = ""
  const userRewards: Array<IReward> = await Reward.find({ finder: ctx.chat.id })
  const userCollectedRewards: Array<IReward> = userRewards.filter((reward: IReward) => reward.collected === true)
  session.userCollectedRewards = userCollectedRewards
  const userNonCollectedRewards: Array<IReward> = _.chain(userRewards)
    .filter((reward: IReward) => reward.collected === false && reward.expiry > new Date())
    .orderBy(["createdAt"], ["asc"]).value()
  session.userNonCollectedRewards = userNonCollectedRewards

  reply += `You have collected a total of *${userCollectedRewards.length}* treasure(s).\n\n` +
    `*${userNonCollectedRewards.length}* additional treasure(s) have been scanned but their NFTs not ` +
    `collect by you yet.\n\n`

  if (userNonCollectedRewards.length > 0) {
    reply += `_The ${userNonCollectedRewards.length} treasures that have not been claimed by you yet ` +
      `might _*expire*_ soon! _*Claim*_ them before it's too late!_`
  }
  reply = reply ? reply : "You have no treasures yet."

  return { text: reply, parse_mode: 'Markdown' }
})

listUserRewards.submenu('View collected', 'lco', listCollected)

listUserRewards.submenu('View non-collected', 'lnco', listNonCollected)

const listUserRewardsMiddleware = new MenuMiddleware('lur/', listUserRewards)

export {
  listUserRewardsMiddleware
}
