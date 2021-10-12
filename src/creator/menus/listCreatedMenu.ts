import { MenuTemplate, MenuMiddleware } from "grammy-inline-menu"
import { showCreatedItem } from "./showCreatedItemMenu.js"
import Treasure, { ITreasure } from "../../models/treasure.js"
import { CustomContext } from "../../../types/CustomContext.js"

const listCreated = new MenuTemplate(async (ctx: CustomContext) => {
  const session = await ctx.session
  session.editMode = false
  session.showMode = false
  const userCreated = await Treasure.find({ creator: ctx.chat.id }).sort({ createdAt: "desc" })
  session.userCreated = userCreated
  if (userCreated.length > 0) {
    return `Here are all your created treasures sorted by newest:`
  }
  return `You did not create any treasures yet. Click on '💎 Create treasure 💎' ` +
    `to create your first one now!`
})

listCreated.chooseIntoSubmenu(
  "i",
  async (ctx: any) => {
    const session = await ctx.session
    if (!session.userCreated || session.userCreated.length === 0)
      return ""
    return session.userCreated.map((treasure: ITreasure) =>
      treasure._id
    )
  },
  showCreatedItem,
  {
    hide: async (ctx: CustomContext) => {
      const session = await ctx.session
      if (
        !session ||
        !session.userCreated ||
        session.userCreated.length === 0
      )
        return true
      return false
    },
    maxRows: 5,
    columns: 1,
    buttonText: async (ctx: CustomContext, key) => {
      const session = await ctx.session
      if (key === "")
        return
      const treasure = session.userCreated.find((treasure: ITreasure) => treasure._id.equals(key))
      return `${treasure.name} - ${treasure.createdAt.toLocaleDateString()}`
    },
    getCurrentPage: async (ctx) => {
      const session = await ctx.session
      return session.createdPage
    },
    setPage: async (ctx, page) => {
      const session = await ctx.session
      session.createdPage = page
    },
  }
)

export const listCreatedMiddleware = new MenuMiddleware('lc/', listCreated)

