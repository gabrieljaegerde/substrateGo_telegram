import { MenuTemplate, createBackMainMenuButtons, deleteMenuFromContext } from "grammy-inline-menu";
import { botParams, getKeyboard } from "../../../config.js";
import fetch, { Response } from 'node-fetch';
import { listUserRewardsMiddleware } from "./listUserRewardsMenu.js";
import { editNameReward } from "../editNameReward.js";
import Reward, { IReward } from "../../models/reward.js";
import Treasure, { ITreasure } from "../../models/treasure.js";
import { IUser } from "../../models/user.js";
import { CustomContext } from "../../../types/CustomContext.js";
import { InlineKeyboard, InputFile } from "grammy";

export const showCollectedItem = new MenuTemplate(async (ctx: CustomContext) => {
  const session = await ctx.session;
  const reward: IReward = await Reward.findOne({ _id: ctx.match[1], finder: ctx.chat.id });
  session.reward = reward;
  const treasure: ITreasure = await Treasure.findOne({ _id: reward.treasureId });
  const creator: IUser = await treasure.getCreator()
  const collectedTimes = await treasure.howManyCollected();
  let info = `_Name_: *${reward.name}*\n\n_Creator_: *${creator._id}*\n\nYou collected this ` +
    `treasure on *${reward.dateCollected.toDateString()}*.\n\n` +
    `_Description_: ${reward.description}\n\n`;
  if (collectedTimes) {
    info += `Treasure has been collected by *${collectedTimes - 1}* others.`;
    if (collectedTimes === 1) {
      info += `\n\nYou are the *ONLY* one that has collected this treasure so far!`;
    }
  }
  return { text: info, parse_mode: "Markdown" };
});

showCollectedItem.interact("🌈 Show NFT", "sn", {
  do: async (ctx: CustomContext) => {
    const session = await ctx.session;
    await deleteMenuFromContext(ctx);
    const loadMessage = await botParams.bot.api
      .sendMessage(ctx.chat.id, "Loading...");
    const response: Response = await fetch(session.reward.file.replace('ipfs://', 'https://ipfs.io/'));
    const json: any = await response.json();
    await botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id);
    const message = `Reward ${session.reward.name}'s NFT:`;
    await ctx.reply(message, {
      reply_markup: {
        keyboard: (await getKeyboard(ctx)).build(),
        resize_keyboard: true
      },
    });
    const image_link = json.image.replace('ipfs://', 'https://ipfs.io/');
    //directly loading image times out inside replyWithPhoto
    const image = await fetch(image_link);
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await ctx.replyWithPhoto(new InputFile(buffer));
    listUserRewardsMiddleware.replyToContext(ctx, `lur/lco/a:${session.reward._id}/`);
    return false;
  },
  joinLastRow: false
});

showCollectedItem.interact("🔗 Show blockchain transaction", "sbt", {
  do: async (ctx: CustomContext) => {
    const session = await ctx.session;
    await deleteMenuFromContext(ctx);
    const message = "What tool would you like to use to view the " +
      "transaction that created this NFT on the blockchain?";
    const inlineKeyboard = new InlineKeyboard();
    botParams.settings
      .getExtrinsicLinks(
        botParams.settings.network.name,
        session.reward.txHash
      )
      .map(row => {
        return row.map(link => {
          return inlineKeyboard.url(link[0], link[1]);
        });
      });
    await botParams.bot.api
      .sendMessage(ctx.chat.id, message, { reply_markup: inlineKeyboard, parse_mode: "Markdown" });

    listUserRewardsMiddleware.replyToContext(ctx, `lur/lco/a:${session.reward._id}/`);
    return false;
  },
  joinLastRow: false
});

showCollectedItem.interact("📝 Edit name", "ens", {
  do: async (ctx: CustomContext) => {
    await deleteMenuFromContext(ctx);
    const message = `Please send me the new name.`;
    editNameReward.replyWithMarkdown(ctx, message);
    return false;
  },
  joinLastRow: false
});

showCollectedItem.manualRow(createBackMainMenuButtons());
