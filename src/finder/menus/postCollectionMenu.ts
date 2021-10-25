import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "grammy-inline-menu";
import { CustomContext } from "../../../types/CustomContext.js";
import { listUserRewardsMiddleware } from "./listUserRewardsMenu.js";

const postCollection = new MenuTemplate(async (ctx: CustomContext) => {
  const session = await ctx.session;
  return `This treasure has been saved in 'My treasures' under the name: ${session.reward.name}.`;
});

postCollection.interact("View treasure", "vtr", {
  do: async (ctx: CustomContext) => {
    const session = await ctx.session;
    await deleteMenuFromContext(ctx);
    listUserRewardsMiddleware.replyToContext(ctx, "lur/lco/")
    return false;
  }
});

export const postCollectionMiddleware = new MenuMiddleware('pcol/', postCollection);
