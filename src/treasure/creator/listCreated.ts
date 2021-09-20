import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import { showCreatedItem } from "./showCreatedItem.js"
import _ from "lodash"

const listCreated = new MenuTemplate(async (ctx: any) => {
  ctx.session.editMode = false
  ctx.session.showMode = false
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var userCreated = botParams.db.chain.get("treasures")
    .filter({ creator: ctx.chat.id })
    .orderBy(["timestamp"], ["desc"])
    .value()
  ctx.session.userCreated = userCreated
  if (userCreated.length > 0) {
    return `Here are all your created treasures sorted by newest:`
  }
  return `You did not create any treasures yet. Click on '💎 Create treasure 💎' ` +
    `to create your first one now!`
})

listCreated.chooseIntoSubmenu(
  "b",
  ctx => {
    return ctx.session.userCreated.map(item =>
      item.id
    )
  },
  showCreatedItem,
  {
    hide: ctx => {
      if (
        !ctx.session ||
        !ctx.session.userCreated ||
        ctx.session.userCreated.length == 0
      )
        true
      return false
    },
    maxRows: 5,
    columns: 1,
    buttonText: (ctx, key) => {
      var item = ctx.session.userCreated.find(item => item.id === key)
      return item.name ? item.name : "Created on: " + item.timestamp
    },
    getCurrentPage: ctx => ctx.session.createdPage,
    setPage: (ctx, page) => {
      ctx.session.createdPage = page
    },
  }
)

const listCreatedMiddleware = new MenuMiddleware('lC/', listCreated)

export {
  listCreatedMiddleware
}
