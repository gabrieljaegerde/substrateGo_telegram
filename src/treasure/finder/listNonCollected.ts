import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons } from "telegraf-inline-menu"
import _ from "lodash"
import { showNonCollectedItem } from "./showNonCollectedItem.js"
import { IReward } from "../../models/reward.js"

const listNonCollected = new MenuTemplate(async (ctx: any) => {
  if (!ctx.session.userNonCollected || ctx.session.userNonCollected.length === 0)
    return `You don't have any non-collected treasures.`
  return `Here are all your non-collected treasures... Claim them now before they expire (30 days after scan)!`
})

listNonCollected.chooseIntoSubmenu(
  "a",
  ctx => {
    if (!ctx.session.userNonCollected || ctx.session.userNonCollected.length === 0)
      return ""
    return ctx.session.userNonCollected.map((reward: IReward) =>
      reward._id
    )
  },
  showNonCollectedItem,
  {
    hide: ctx => {
      if (
        !ctx.session ||
        !ctx.session.userNonCollected ||
        ctx.session.userNonCollected.length === 0
      )
        true
      return false
    },
    buttonText: (ctx, key) => {
      if (key === "")
        return
      let text = ""
      let reward: IReward = ctx.session.userNonCollected.find((reward: IReward) => reward._id.equals(key))
      let dayInMs = 1000 * 60 * 60 * 24
      if ((reward.expiry.getTime() - new Date().getTime()) < (3 * dayInMs)) {
        text = `\u26A0 ${reward.date_of_entry.toDateString()} - ${reward.name} \u26A0`
      }
      else {
        text = `${reward.date_of_entry.toDateString()} - ${reward.name}`
      }
      return text
    },
    maxRows: 5,
    columns: 1,
    getCurrentPage: ctx => ctx.session.nonCollectedPage,
    setPage: (ctx, page) => {
      ctx.session.nonCollectedPage = page
    },
  }
)

listNonCollected.manualRow(createBackMainMenuButtons())

const listNonCollectedMiddleware = new MenuMiddleware('lnco/', listNonCollected)

export {
  listNonCollected,
  listNonCollectedMiddleware
}
