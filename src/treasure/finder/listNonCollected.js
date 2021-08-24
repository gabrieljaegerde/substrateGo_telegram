import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import _ from "lodash"
import { showNonCollectedItem } from "./showNonCollectedItem.js"

const listNonCollected = new MenuTemplate(async ctx => {
  return `Here are all your non-collected treasures... Claim them now before they expire!`
})

listNonCollected.chooseIntoSubmenu(
  "a",
  ctx => {
    return ctx.session.userNonCollected.map(item =>
      item.id
    )
  },
  showNonCollectedItem,
  {
    hide: ctx => {
      if (
        !ctx.session ||
        !ctx.session.userNonCollected ||
        ctx.session.userNonCollected.length == 0
      )
        true
      return false
    },
    buttonText: (ctx, key) => {
      let text = ""
      let item = ctx.session.userNonCollected.find(item => item.id === key)
      let dayInMs = 1000 * 60 * 60 * 24
      if ((new Date(item.expiry) - new Date()) < (3 * dayInMs)){
        text = `\u26A0 ${item.timestamp} \u26A0`
      }
      else {
        text = item.timestamp
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

const listNonCollectedMiddleware = new MenuMiddleware('lNCo/', listNonCollected)

listNonCollected.manualRow(createBackMainMenuButtons())

export {
  listNonCollected,
  listNonCollectedMiddleware
}
