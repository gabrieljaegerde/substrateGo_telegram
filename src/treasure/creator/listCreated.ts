import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import { showCreatedItem } from "./showCreatedItem.js"
import _ from "lodash"
import Treasure, { ITreasure } from "../../models/treasure.js"

const listCreated = new MenuTemplate(async (ctx: any) => {
  console.log("in here")
  ctx.session.editMode = false
  ctx.session.showMode = false
  var userCreated = await Treasure.find({creator: ctx.chat.id}).sort({date_of_entry: "desc"})
  ctx.session.userCreated = userCreated
  console.log("ctx", ctx.update.update_id)
  if (userCreated.length > 0) {
    return `Here are all your created treasures sorted by newest:`
  }
  return `You did not create any treasures yet. Click on '💎 Create treasure 💎' ` +
    `to create your first one now!`
})

listCreated.chooseIntoSubmenu(
  "b",
  ctx => {
    console.log("ctx1", ctx.update.update_id)
    if (!ctx.session.userCreated || ctx.session.userCreated.length === 0)
      return ""
    return ctx.session.userCreated.map((treasure: ITreasure) =>
      treasure._id
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
      if (key === "")
        return
      var treasure = ctx.session.userCreated.find((treasure: ITreasure) => treasure._id.equals(key))
      return treasure.name ? treasure.name : "Created on: " + treasure.date_of_entry.toDateString()
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
