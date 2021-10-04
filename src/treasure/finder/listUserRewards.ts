import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "telegraf-inline-menu"
import { listCollectedMiddleware, listCollected } from "./listCollected.js"
import { listNonCollectedMiddleware, listNonCollected } from "./listNonCollected.js"
import _ from "lodash"
import Reward, { IReward } from "../../models/reward.js"

const listUserRewards = new MenuTemplate(async (ctx: any) => {
  console.log("ctx1", ctx.update.update_id)
  var reply = ""
  var userRewards: Array<IReward> = await Reward.find({ finder: ctx.chat.id })
  var userCollected: Array<IReward> = userRewards.filter((reward: IReward) => reward.collected === true)
  ctx.session.userCollected = userCollected
  console.log("ctx.session.userCollected", ctx.session.userCollected.length)
  var userNonCollected: Array<IReward> = _.chain(userRewards)
    .filter((reward: IReward) => reward.collected === false && reward.expiry > new Date())
    .orderBy(["date_of_entry"], ["asc"]).value()
  console.log("userNonCollected", userNonCollected.length)
  ctx.session.userNonCollected = userNonCollected

  reply += `You have collected a total of *${userCollected.length}* treasures.\n` +
    `*${userNonCollected.length}* additional treasures have been scanned but their NFTs not ` +
    `collect by you yet).`

  if (userNonCollected.length > 0) {
    reply += `The _${userNonCollected.length}_ treasures that have not been claimed by you yet ` +
      `might expire soon! Claim them before it's too late!`
  }
  reply = reply ? reply : "You have no treasures yet."

  return { text: reply, parse_mode: 'Markdown' }
})

listUserRewards.submenu('View collected', 'lco', listCollected, {
  // hide: ((ctx) => {
  //   console.log("ctx", ctx.update.update_id)
  //   console.log("ctx.session.userCollected12", ctx.session.userCollected)
  //   return !ctx.session.userCollected || !(ctx.session.userCollected.length > 0)
  // })
})

listUserRewards.submenu('View non-collected', 'lnco', listNonCollected, {
  //hide: ctx => !ctx.session.userNonCollected || !(ctx.session.userNonCollected.length > 0)
})

// listUserRewards.interact("View collected", "lco", {
//   do: async (ctx: any) => {
//     await deleteMenuFromContext(ctx)
//     listCollectedMiddleware.replyToContext(ctx)
//     return false
//   },
//   joinLastRow: false
// })

// listUserRewards.interact("View non-collected", "lnco", {
//   do: async (ctx: any) => {
//     await deleteMenuFromContext(ctx)
//     listNonCollectedMiddleware.replyToContext(ctx)
//     return false
//   },
//   joinLastRow: false
// })

const listUserRewardsMiddleware = new MenuMiddleware('lur/', listUserRewards)

export {
  listUserRewardsMiddleware
}
