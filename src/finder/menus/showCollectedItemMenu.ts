import { MenuTemplate, createBackMainMenuButtons, deleteMenuFromContext } from "grammy-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import { Markup } from "telegraf"
import fetch from 'node-fetch'
import { listUserRewardsMiddleware } from "./listUserRewardsMenu.js"
import { editNameReward } from "../editNameReward.js"
import Reward, { IReward } from "../../models/reward.js"
import { CustomContext } from "../../../types/CustomContext.js"
import { InlineKeyboard } from "grammy"

const showCollectedItem = new MenuTemplate(async (ctx: CustomContext) => {
  const session = await ctx.session
  const reward: IReward = await Reward.findOne({ _id: ctx.match[1], finder: ctx.chat.id })
  session.reward = reward
  const allRewards: Array<IReward> = await Reward.find({ treasureId: reward.treasureId, collected: true })
  let info = `Name: ${reward.name}\n\nYou collected this ` +
    `treasure on ${reward.dateCollected.toDateString()}.\n\n`
  if (allRewards) {
    info += `Treasure has been collected by ${allRewards.length - 1} others.`
    if (allRewards.length == 1) {
      info += `\n\nYour are the ONLY one that has collected this treasure so far!`
    }
  }
  //todo: add more info regarding treasure
  return info
})

showCollectedItem.interact("Show NFT", "sn", {
  do: async (ctx: CustomContext) => {
    const session = await ctx.session
    await deleteMenuFromContext(ctx)
    const loadMessage = await botParams.bot.api
      .sendMessage(ctx.chat.id, "Loading...")
    const response: any = await fetch(session.reward.file.replace('ipfs://', 'https://ipfs.io/'))
    const json: any = await response.json()
    await botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
    const message = `Treasure '${session.reward.name}' NFT:`
    await ctx.reply(message, {
      reply_markup: {
        keyboard: (await getKeyboard(ctx)).build(),
        resize_keyboard: true
      },
    })
    await ctx.replyWithPhoto(json.image.replace('ipfs://', 'https://ipfs.io/'));
    listUserRewardsMiddleware.replyToContext(ctx, `lur/lco/a:${session.reward._id}/`)
    return false
  },
  joinLastRow: false
})

showCollectedItem.interact("Show blockchain transaction", "sbt", {
  do: async (ctx: CustomContext) => {
    const session = await ctx.session
    await deleteMenuFromContext(ctx)
    const message = "What tool would you like to use to view the " +
      "transaction that created this NFT on the blockchain?"
    const inlineKeyboard = new InlineKeyboard()
    const links = botParams.settings
      .getExtrinsicLinks(
        botParams.settings.network.name,
        session.reward.txHash
      )
      .map(row => {
        return row.map(link => {
          return inlineKeyboard.url(link[0], link[1])
        })
      })
    await botParams.bot.api
      .sendMessage(ctx.chat.id, message, { reply_markup: inlineKeyboard, parse_mode: "Markdown" })

    listUserRewardsMiddleware.replyToContext(ctx, `lur/lco/a:${session.reward._id}/`)
    return false
  },
  joinLastRow: false
})

showCollectedItem.interact("Edit name", "ens", {
  do: async (ctx: CustomContext) => {
    await deleteMenuFromContext(ctx)
    const message = `Please send me the new name.`
    editNameReward.replyWithMarkdown(ctx, message)
    return false
  },
  joinLastRow: false
})

showCollectedItem.manualRow(createBackMainMenuButtons())

export {
  showCollectedItem
}
