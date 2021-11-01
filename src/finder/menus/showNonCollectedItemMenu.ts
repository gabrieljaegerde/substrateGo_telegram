import { MenuTemplate, deleteMenuFromContext, createBackMainMenuButtons } from "grammy-inline-menu";
import { prepareCollection } from "../collectTreasure.js";
import Treasure, { ITreasure } from "../../models/treasure.js";
import Reward, { IReward } from "../../models/reward.js";
import User, { IUser } from "../../models/user.js";
import { claimNftMiddleware } from "./claimNftMenu.js";
import { CustomContext } from "../../../types/CustomContext.js";

export const showNonCollectedItem = new MenuTemplate<CustomContext>(async (ctx) => {
  const session = await ctx.session;
  const reward: IReward = await Reward.findOne({ _id: ctx.match[1], finder: ctx.chat.id });
  const treasure: ITreasure = await Treasure.findOne({ _id: reward.treasureId });
  session.code = treasure.code;
  const creator = await treasure.getCreator();
  const info = `Treasure: *${reward.name}*\nCreator: *${creator._id}*\n\n` +
    `This treasure will expire on ${reward.expiry.toDateString()}. Claim it before then!`;
    return { text: info, parse_mode: "Markdown" };
});

showNonCollectedItem.interact("Claim", "vnc", {
  do: async (ctx: CustomContext) => {
    const session = await ctx.session;
    await deleteMenuFromContext(ctx);
    const { treasure, collectStep } = await prepareCollection(ctx, session.code, false);
    session.treasure = treasure;
    session.collectStep = collectStep;
    if (treasure)
      await claimNftMiddleware.replyToContext(ctx);
    return false;
  },
  joinLastRow: true
});

showNonCollectedItem.manualRow(createBackMainMenuButtons());

