import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons } from "grammy-inline-menu";
import _ from "lodash";
import { showCollectedItem } from "./showCollectedItemMenu.js";
import Reward, { IReward } from "../../models/reward.js";
import { CustomContext } from "../../../types/CustomContext.js";

export const listCollected = new MenuTemplate<CustomContext>(async (ctx) => {
  const session = await ctx.session;
  const userCollectedRewards: IReward[] = await Reward.find({ finder: ctx.chat.id, collected: true });
  const userCollectedRewardsOrdered = _.orderBy(userCollectedRewards, ["dateCollected"], ["desc"]);
  session.userCollectedRewards = userCollectedRewardsOrdered;
  if (!session.userCollectedRewards || session.userCollectedRewards.length === 0)
    return `You don't have any collected treasures.`;
  return `Here are all your collected treasures sorted by newest:`;
});

listCollected.chooseIntoSubmenu(
  "a",
  async (ctx: any) => {
    const session = await ctx.session;
    if (!session.userCollectedRewards || session.userCollectedRewards.length === 0)
      return "";
    return session.userCollectedRewards.map((reward: IReward) =>
      reward._id
    );
  },
  showCollectedItem,
  {
    hide: async (ctx) => {
      const session = await ctx.session;
      if (
        !session ||
        !session.userCollectedRewards ||
        session.userCollectedRewards.length == 0
      ) {
        return true;
      }
      return false;
    },
    maxRows: 5,
    columns: 1,
    buttonText: async (ctx, key) => {
      const session = await ctx.session;
      if (key === "")
        return;
      const reward = session.userCollectedRewards.find((reward: IReward) => reward._id.equals(key));
      return `${reward.name} - ${reward.createdAt.toLocaleDateString()}`;
    },
    getCurrentPage: async (ctx) => {
      const session = await ctx.session;
      return session.collectedRewardsPage;
    },
    setPage: async (ctx, page) => {
      const session = await ctx.session;
      session.collectedRewardsPage = page;
    },
  }
);

listCollected.manualRow(createBackMainMenuButtons());

export const listCollectedMiddleware = new MenuMiddleware('lco/', listCollected);
