import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import _ from "lodash"
import { showCollectedItem } from "./showCollectedItem.js"

const listCollected = new MenuTemplate(async ctx => {
  //ctx.session.collectedPage = null
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var userScanned = botParams.db.chain.get("scanned").filter({ finder: ctx.chat.id }).value()
  var userCollected = _.chain(userScanned)
    .filter(item => item.collected === true)
    .orderBy(["timestampCollected"],["desc"]).value()
  ctx.session.userCollected = userCollected
  return `Here are all your collected treasures sorted by newest:`
})

listCollected.chooseIntoSubmenu(
  "a",
  ctx => {
    return ctx.session.userCollected.map(item =>
      item.id
    )
  },
  showCollectedItem,
  {
    hide: ctx => {
      if (
        !ctx.session ||
        !ctx.session.userCollected ||
        ctx.session.userCollected.length == 0
      )
        true
      return false
    },
    maxRows: 5,
    columns: 1,
    buttonText: (ctx, key) => {
      return ctx.session.userCollected.find(item => item.id === key).name
    },
    getCurrentPage: ctx => ctx.session.collectedPage,
    setPage: (ctx, page) => {
      ctx.session.collectedPage = page
    },
  }
)

const listCollectedMiddleware = new MenuMiddleware('lCo/', listCollected)

listCollected.manualRow(createBackMainMenuButtons())

export {
  listCollected,
  listCollectedMiddleware
}
