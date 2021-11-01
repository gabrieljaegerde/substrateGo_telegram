import { MenuTemplate, MenuMiddleware } from "grammy-inline-menu";
import { listCollected } from "./listCollectedMenu.js";
import { listNonCollected } from "./listNonCollectedMenu.js";
import _ from "lodash";
import Reward, { IReward } from "../../models/reward.js";
import { CustomContext } from "../../../types/CustomContext.js";

const listUserRewards = new MenuTemplate<CustomContext>(async (ctx) => {
  const session = await ctx.session;
  let reply = "";
  const userRewards: IReward[] = await Reward.find({ finder: ctx.chat.id });
  const userCollectedRewards: IReward[] = userRewards.filter((reward: IReward) => reward.collected === true);
  session.userCollectedRewards = userCollectedRewards;
  const userNonCollectedRewards: IReward[] = _.chain(userRewards)
    .filter((reward: IReward) => !reward.collected && reward.expiry > new Date())
    .orderBy(["createdAt"], ["asc"]).value();
  session.userNonCollectedRewards = userNonCollectedRewards;

  reply += `You have collected a total of *${userCollectedRewards.length}* treasure(s).\n\n` +
    `*${userNonCollectedRewards.length}* additional treasure(s) have been scanned but their NFTs not ` +
    `collect by you yet.\n\n`;

  if (userNonCollectedRewards.length > 0) {
    reply += `_The ${userNonCollectedRewards.length} treasures that have not been claimed by you yet ` +
      `might _*expire*_ soon! _*Claim*_ them before it's too late!_`;
  }
  reply = reply ? reply : "You have no treasures yet.";

  return { text: reply, parse_mode: 'Markdown' };
});

listUserRewards.submenu('🧸 View collected', 'lco', listCollected);

listUserRewards.submenu('🎁 View non-collected', 'lnco', listNonCollected);

export const listUserRewardsMiddleware = new MenuMiddleware('lur/', listUserRewards);

