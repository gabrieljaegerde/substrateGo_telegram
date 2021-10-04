import { Telegraf, Markup, Context } from "telegraf"
import { botParams, getKeyboard } from "./config.js"
import { addWallet } from "./src/wallet/add.js"
import { editWalletMiddleware, enterAddress } from "./src/wallet/edit.js"
import { bigNumberArithmetic, amountToHumanString } from "./src/wallet/walletHelpers.js"
import { enterAmount, withdrawBalanceMiddleware } from "./src/wallet/withdraw.js"
import { infoMiddleware, linkAddress } from "./src/wallet/info.js"
import { uploadTreasure } from "./src/treasure/creator/addTreasure.js"
import { listUserRewardsMiddleware } from "./src/treasure/finder/listUserRewards.js"
import { listCreatedMiddleware } from "./src/treasure/creator/listCreated.js"
import { editDescription } from "./src/treasure/creator/editDescription.js"
import { editNameTreasure } from "./src/treasure/creator/editNameTreasure.js"
import { editNameReward } from "./src/treasure/finder/editNameReward.js"
import { claimNftMiddleware } from "./src/treasure/finder/claimNft.js"
import { collectTreasure, getTreasure } from "./src/treasure/finder/collectTreasure.js"
import { createTreasureMiddleware } from "./src/treasure/creator/createTreasure.js"
import { listCollectedMiddleware } from "./src/treasure/finder/listCollected.js"
import { listNonCollectedMiddleware } from "./src/treasure/finder/listNonCollected.js"
//import prom from "./metrics.js"
import _ from "lodash"
import { fastTrackGet } from "./src/treasure/finder/collectTreasure.js"
import { session } from 'telegraf-session-mongodb'
import { editFile } from "./src/treasure/creator/editFile.js"
import { createTreasureGuideMiddleware } from "./src/treasure/creator/createTreasureGuide.js"
import { findClosest, findTreasuresMiddleware } from "./src/treasure/finder/findTreasures.js"
import User, { IUser } from "./src/models/user.js"
import Treasure, { ITreasure } from "./src/models/treasure.js"
import mongoose from "mongoose"
import { resetSession } from "./tools/utils.js"

// const telegramBotUpdates = new prom.Counter({
//   name: "substrate_bot_telegram_updates",
//   help: "metric_help",
// })

export interface SessionContext extends Context {
  session: any;
};

export const run = async function (params) {
  /*
   *   BOT initialization
   */
  
  const bot = new Telegraf<SessionContext>(botParams.settings.botToken)
  const { db } = mongoose.connection
  bot.use(session(db, { collectionName: 'sessions' }))
  
  /*
   *   Message on command /start (Hello msg)
   */
  bot.start(async (ctx: any) => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
      var message
      //normal start
      if (ctx.message.text === "/start") {
        message = `Welcome to *${botParams.settings.network.name}Go*:\nthe global *NFT Treasure Hunt* game 💰.\n\n` +
          "With this bot you can easily:\n• *create* NFT treasures 💎 _and hide them all around the world 🌏 for others " +
          "to find._\n• hunt and *collect* NFT treasures 🎁.\n\n" +
          "There are no fees to use this bot except the automatic network fees.\n\n" +
          `Please start by connecting a ${botParams.settings.network.name} wallet to this account ` +
          "by clicking on '🛠️ Account Settings' in the menu below.\n\n" +
          "_Under no circumstances shall the creators of this bot be held responsible " +
          "for lost, stolen or misdirected funds. Please use the bot with caution " +
          "and only ever transfer small amounts to the bots deposit wallet._"
      }
      //if user arrived at this bot by scannning treasure QR
      else {
        //if user exists in db -> not new user
        if (user) {
          message = "For future reference: You can directly scan QR Codes in here by hitting " +
            "'Scan Qr' in the menu below. "
        }
        //new user
        else {
          message = "Welcome new user! It seems like you have stumbled accross one of our " +
            `QR Codes. What you just found is a *${botParams.settings.network.name}Go* ` +
            "treasure!!! A lucky bird 🦩 you are...\n\n" +
            `*${botParams.settings.network.name}Go*: the global *NFT Treasure Hunt* game 💰\n\n` +
            "With this bot you can easily:\n• *create* NFT treasures 💎 _and hide them all around the world 🌏 for others " +
            "to find._\n• hunt and *collect* NFT treasures 🎁.\n\n" +
            "There are no fees to use this bot except the automatic network fees.\n\n" +
            `Please start by connecting a ${botParams.settings.network.name} wallet to this account ` +
            "by clicking on '🛠️ Account Settings' in the menu below.\n\n" +
            "_Under no circumstances shall the creators of this bot be held responsible " +
            "for lost, stolen or misdirected funds. Please use the bot with caution " +
            "and only ever transfer small amounts to the bots deposit wallet._"
        }
        //the QR code id is sent in with the /start command.
        //seperate the id out
        var qrId = ctx.message.text.replace("/start", "").replace(/\s/g, "")
        await new User({
          first_name: ctx.chat.first_name,
          username: ctx.chat.username,
          chat_id: ctx.chat.id,
          type: ctx.chat.type,
          total_reward_balance: "0",
          reward_balance: "0",
          wallet: {},
          old_wallets: [],
          blocked: false,
          date_of_entry: new Date()
        }).save()
        //botParams.db.chain.get("users").push(user).value()
        //botParams.db.write()
      }
      //if new user -> add to db
      if (!user) {
        await new User({
          first_name: ctx.chat.first_name,
          username: ctx.chat.username,
          chat_id: ctx.chat.id,
          type: ctx.chat.type,
          total_reward_balance: "0",
          reward_balance: "0",
          wallet: {},
          old_wallets: [],
          blocked: false,
          date_of_entry: new Date()
        }).save()
      }
      await ctx.replyWithMarkdown(
        message,
        Markup.keyboard(await getKeyboard(ctx)).resize()
      )
      if (ctx.message.text !== "/start") {
        fastTrackGet(ctx, qrId)
      }
      return
    }
  })

  /*
   *   /menu command handler
   */
  bot.command("menu", async (ctx: any) => {
    if (ctx.chat.type == "private") {
      let reply = "Here you go"
      ctx.replyWithMarkdown(
        reply,
        Markup.keyboard(await getKeyboard(ctx)).resize()
      )
    }
  })

  /*
   *   /stats command handler
   */
  const antispamOn = {}
  bot.command("stats", async (ctx: any) => {
    if (ctx.chat.type == "group" || ctx.chat.type == "supergroup") {
      if (!antispamOn[ctx.chat.id]) {
        antispamOn[ctx.chat.id] = true
        setTimeout(() => (antispamOn[ctx.chat.id] = false), 60000)
        //todo: send bot stats
      } else {
        ctx.reply("Time limit 1 min for /stats command")
      }
    }
  })

  /*
   *   React bot on 'View stats' message
   */

  bot.hears("📊 View stats", async (ctx) => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
      var userTreasures: Array<ITreasure> = await Treasure.find({ creator: ctx.chat.id })
      var message = ""
      var collectedCount = 0
      var treasureMessages = ""
      if (userTreasures.length > 0) {
        //console.log("userTreasures", userTreasures)
        await Promise.all(userTreasures.map(async (treasure: ITreasure) => {
          let timesCollected = await treasure.howManyCollected()
          treasureMessages += `Treasure '${treasure.name}' was collected ${timesCollected} time(s).\n`
          collectedCount += timesCollected
        }))
        message = `Your ${userTreasures.length} treasures have already been collected ${collectedCount} times.\n\n`
        message += `Total Rewards earned: ${amountToHumanString(user.total_reward_balance)}\n\n`
        message += treasureMessages
      }
      else {
        message = `You do not have any treasures yet. Go and create some today!`
      }
      ctx.replyWithMarkdown(
        message,
        Markup.keyboard(await getKeyboard(ctx)).resize()
      )
      return
    }
  })

  /*
   *   React bot on 'Collect treasure' message
   */

  bot.hears("📷 Collect treasure", ctx => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      collectTreasure(ctx)
    }
  })

  /*
   *   React bot on 'Create treasure' message
   */

  bot.hears("💎 Create treasure 💎", ctx => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      createTreasureMiddleware.replyToContext(ctx)
    }
  })

  /*
   *   React bot on 'Edit address' message
   */

  bot.hears("\uD83D\uDCEA Edit address", async (ctx) => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
      var replyMsg = `Current Address:\n_${user.wallet.address}_\n\n` +
        `Enter new ${botParams.settings.network.name} address:`
      enterAddress.replyWithMarkdown(ctx, replyMsg)
      //addWallet(ctx)
      //addWalletMiddleware.setSpecific(ctx)
    }
  })

  /*
   *   React bot on 'Add address' message
   */

  bot.hears("\uD83D\uDCEA Add address", ctx => {
    if (ctx.chat.type == "private") {
      addWallet(ctx)
      //addWalletMiddleware.setSpecific(ctx)
    }
  })

  /*
   *   React bot on 'My treasures' message
   */

  bot.hears("🎁 My treasures", ctx => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      listUserRewardsMiddleware.replyToContext(ctx)
    }
  })

  /*
   *   React bot on 'Withdraw' message
   */

  bot.hears("\uD83E\uDDFE Withdraw", async (ctx) => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
      let replyMsg = `Your balance: *${amountToHumanString(user.getBalance())}*\n\nHow much would you ` +
        `like to withdraw?\n\n_Please use '.' notation instead of commas. e.g. 0.02 or 0.5 or 1.4 etc._`
      enterAmount.replyWithMarkdown(ctx, replyMsg)
      //withdrawBalanceMiddleware.replyToContext(ctx)
    }
  })

  /*
   *   React bot on '🔗 Link address' message
   */

  bot.hears("🔗 Link address", ctx => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      linkAddress(ctx)
    }
  })

  /*
   *   React bot on 'Deposit' message
   */

  bot.hears("\u26A0 Deposit \u26A0", ctx => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      infoMiddleware.replyToContext(ctx)
    }
  })

  /*
   *   React bot on 'Edit treasures' message
   */

  bot.hears("✏️ Edit treasures", async (ctx: any) => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      listCreatedMiddleware.replyToContext(ctx)
    }
  })

  /*
   *   React bot on 'Creator Mode' message
   */

  bot.hears("🧙🏻‍♀️ Creator Mode", async (ctx: any) => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      ctx.session.menu = "creator"
      ctx.replyWithMarkdown(
        "You have entered 🧙🏻‍♀️ *creator* mode.\n\nHere you can:\n• *create* new treasures💎\n" +
        "• *edit* treasures✏️\n" +
        "• and *track* their performance📊.\n\n_Each time a user collects your treasures, you receive a " +
        `small reward (${amountToHumanString(botParams.settings.creatorReward)}). The NFT treasure ` +
        `sent to the finders is customizable by you. Go create awesome treasures and earn!_`,
        Markup.keyboard(await getKeyboard(ctx)).resize()
      )
    }
  })

  /*
   *   React bot on 'Finder Mode' message
   */

  bot.hears("🕵🏾‍♂️ Finder Mode", async (ctx: any) => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      ctx.session.menu = "finder"
      ctx.replyWithMarkdown(
        "You have entered 🕵🏾‍♂️ *finder* mode.\n\nHere you can:\n• *collect* treasures 📷\n" +
        "• *find* treasures 🔍\n• and *view* your found treasures 🎁\n\n_Each time you collect a treasure, " +
        `an NFT gets created on the ${botParams.settings.network.name}. These prove your ownership of ` +
        "the treasures and can be freely traded on the open market._",
        Markup.keyboard(await getKeyboard(ctx)).resize()
      )
    }
  })

  /*
   *   React bot on 'Account Settings' message
   */
  var regex = new RegExp(/.*Account Settings.*/i)
  bot.hears(regex, async (ctx: any) => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      ctx.session.menu = "account"
      await ctx.replyWithMarkdown(
        "Welcome to your 🛠️ Account Settings. Let me give you some quick info.",
        Markup.keyboard(await getKeyboard(ctx)).resize()
      )
      infoMiddleware.replyToContext(ctx)
    }
  })

  /*
   *   React bot on 'Back to main menu' message
   */

  bot.hears("\u2B05 Back to main menu", async (ctx: any) => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      ctx.session.menu = "main"
      ctx.replyWithMarkdown(
        "Welcome home 🏠",
        Markup.keyboard(await getKeyboard(ctx)).resize()
      )
    }
  })

  /*
   *   React bot on 'Find treasures' message
   */

  bot.hears("🔍 Find treasures", async (ctx: any) => {
    if (ctx.chat.type == "private") {
      resetSession(ctx)
      findTreasuresMiddleware.replyToContext(ctx)
    }
  })

  bot.use(findTreasuresMiddleware)

  bot.use(infoMiddleware)

  bot.use(createTreasureMiddleware)

  bot.use(createTreasureGuideMiddleware)

  bot.use(uploadTreasure.middleware())

  bot.use(findClosest.middleware())

  bot.use(editDescription.middleware())

  bot.use(editNameTreasure.middleware())

  bot.use(editNameReward.middleware())

  bot.use(editFile.middleware())

  bot.use(getTreasure.middleware())

  //bot.use(Telegraf.log())

  bot.use(listCreatedMiddleware)

  bot.use(listCollectedMiddleware)

  bot.use(listUserRewardsMiddleware)

  bot.use(editWalletMiddleware)

  bot.use(listNonCollectedMiddleware)

  bot.use(withdrawBalanceMiddleware)

  bot.use(claimNftMiddleware)

  bot.use(enterAddress.middleware())

  bot.use(enterAmount.middleware())

  /*
   *   Collect and show in console all bot errors
   *   except 'message is not modified' & 'message to edit not found'
   */
  bot.catch(error => {
    if (
      (error as any).message.includes("message is not modified") ||
      (error as any).message.includes("message to edit not found")
    ) {
      return
    }
    console.log(new Date(), "Error", error)
  })


  //Initialization of all menus
  // bot.use((ctx, next) => {
  //   if (ctx.callbackQuery) {
  //     //console.log('callback data just happened', ctx.callbackQuery.data)
  //   }
  //   return next()
  // })

  //menu.init()?
  await bot.launch()
  console.log(new Date(), "Bot started as", bot.botInfo.username)
  return bot
}
