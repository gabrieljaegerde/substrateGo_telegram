import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import { Markup } from "telegraf"
import _ from "lodash"
import fetch from 'node-fetch'
import { listUserRewardsMiddleware } from "./listUserRewards.js"
import { editNameReward } from "./editNameReward.js"
import Treasure, { ITreasure } from "../../models/treasure.js"
import Reward, { IReward } from "../../models/reward.js"

const showCollectedItem = new MenuTemplate(async (ctx: any) => {
  const reward: IReward = await Reward.findOne({ _id: ctx.match[1], finder: ctx.chat.id })
  ctx.session.reward = reward
  var allRewards: Array<IReward> = await Reward.find({ treasure_id: reward.treasure_id, collected: true })
  let info = `Name: ${reward.name}\n\nYou collected this ` +
    `treasure on ${reward.date_collected.toDateString()}.\n\n`
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
  do: async (ctx: any) => {
    await deleteMenuFromContext(ctx)
    var loadMessage = await botParams.bot.telegram
      .sendMessage(ctx.chat.id, "Loading...")
    var response = await fetch(`https://ipfs.io/ipfs/${ctx.session.reward.file}`)
    let buffer = await response.buffer()
    await botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
    ctx.replyWithMarkdown(
      `Treasure '${ctx.session.reward.name}' NFT:`,
      Markup.keyboard(await getKeyboard(ctx)).resize()
    )
    await botParams.bot.telegram
      .sendPhoto(ctx.chat.id, { source: buffer })
    listUserRewardsMiddleware.replyToContext(ctx, `ls/lco/a:${ctx.session.reward._id}/`)
    return true
  },
  joinLastRow: false
})

showCollectedItem.interact("Show blockchain transaction", "sbt", {
  do: async (ctx: any) => {
    //await deleteMenuFromContext(ctx)
    var links = botParams.settings
      .getExtrinsicLinks(
        botParams.settings.network.name,
        ctx.session.reward.txHash
      )
      .map(row => {
        console.log("row", row)
        return row.map(link => {
          return Markup.button.url(link[0], link[1])
        })
      })
    let message = "What tool would you like to use to view the " +
      "transaction that created this NFT on the blockchain?"
    await botParams.bot.telegram
      .sendMessage(ctx.chat.id, message, Markup.inlineKeyboard(links))
    return true
  },
  joinLastRow: false
})

showCollectedItem.interact("Edit name", "ens", {
  do: async (ctx: any) => {
    //await deleteMenuFromContext(ctx)
    var message = `Please send me the new name.`
    editNameReward.replyWithMarkdown(ctx, message)
    return true
  },
  joinLastRow: false
})

showCollectedItem.manualRow(createBackMainMenuButtons())

export {
  showCollectedItem
}
