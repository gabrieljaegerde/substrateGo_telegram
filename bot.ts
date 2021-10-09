import { Bot, lazySession, GrammyError, HttpError } from "grammy"
import { hydrateFiles } from "@grammyjs/files";
import { botParams, getKeyboard } from "./config.js"
import { claimNftMiddleware } from "./src/finder/menus/claimNftMenu.js"
import { prepareCollection } from "./src/finder/collectTreasure.js"
//import prom from "./metrics.js"
import User, { IUser } from "./src/models/user.js"
import Treasure from "./src/models/treasure.js"
import Qr from "./src/models/qr.js"
import mongoose from "mongoose"
import { resetSession } from "./tools/utils.js"
import { sessionAdapter } from "./tools/sessionAdapter.js";
import type { CustomContext } from './types/CustomContext'
import type { SessionData } from './types/SessionData'
import { prepareSetup, router as createRouter } from './src/creator/addTreasure.js'
import { accountComposer } from "./src/composers/accountComposer.js";
import { creatorComposer } from "./src/composers/creatorComposer.js";
import { finderComposer } from "./src/composers/finderComposer.js";
import { apiThrottler } from "@grammyjs/transformer-throttler";

// const telegramBotUpdates = new prom.Counter({
//   name: "substrate_bot_telegram_updates",
//   help: "metric_help",
// })

// define shape of our session


// flavor the context type to include sessions

export const run = async (params): Promise<Bot> => {
  /*
   *   BOT initialization
   */
  const bot = new Bot<CustomContext>(botParams.settings.botToken)
  bot.api.config.use(apiThrottler())
  const { db } = mongoose.connection
  bot.use(
    lazySession({
      initial(): SessionData {
        return {
          menu: null,
          treasureLocation: null,
          treasure: null,
          guideStep: null,
          guideMessageChatId: null,
          guideMessageMessageId: null,
          editMode: null,
          showMode: null,
          wallet: null,
          reward: null,
          userCreated: null,
          treasureId: null,
          withdrawAmount: null,
          hideWithdrawButtons: null,
          createdPage: null,
          remark: null,
          userNonCollectedRewards: null,
          userCollectedRewards: null,
          nonCollectedRewardsPage: null,
          collectedRewardsPage: null,
          treasureToClaim: null,
          code: null,
          nft: null,
          hideClaimButtons: null,
          createStep: ""
        };
      },
      storage: new sessionAdapter(db),
    })
  );

  bot.api.config.use(hydrateFiles(bot.token))

  bot.use(accountComposer)

  bot.use(creatorComposer)

  bot.command("start", async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
      await resetSession(ctx)
      const session = await ctx.session
      const user: IUser = await User.findOne({ chatId: ctx.chat.id })
      let message
      //normal start
      if (!user) {
        await new User({
          firstName: ctx.chat.first_name,
          username: ctx.chat.username,
          chatId: ctx.chat.id,
          type: ctx.chat.type,
          totalRewardBalance: "0",
          rewardBalance: "0",
          wallet: null,
          oldWallets: [],
          blocked: false
        }).save()
      }
      //dont show message when user is passing in qrcode and not new
      if (!user || user && ctx.message.text === "/start") {
        message = `Welcome to *${botParams.settings.network.name}Go*:\nthe global *NFT Treasure Hunt* game 💰.\n\n` +
          "With this bot you can easily:\n• *create* NFT treasures 💎 _and hide them all around the world 🌏 for others " +
          "to find._\n• hunt and *collect* NFT treasures 🎁.\n\n" +
          "There are no fees to use this bot except the automatic network fees.\n\n" +
          `Please start by connecting a ${botParams.settings.network.name} wallet to this account ` +
          "by clicking on '🛠️ Account Settings' in the menu below.\n\n" +
          "_Under no circumstances shall the creators of this bot be held responsible " +
          "for lost, stolen or misdirected funds. Please use the bot with caution " +
          "and only ever transfer small amounts to the bots deposit wallet._"
        await ctx.reply(
          message,
          {
            reply_markup: {
              keyboard: (await getKeyboard(ctx)).build(),
              resize_keyboard: true
            },
            parse_mode: "Markdown",
          }
        )
      }

      if (ctx.message.text !== "/start") {
        {
          //the QR code id is sent in with the /start command.
          //seperate the id out
          const code = ctx.message.text.replace("/start", "").replace(/\s/g, "")
          const userIsCreator: boolean = await Qr.exists({ code: code, creator: ctx.chat.id })
          const treasureExists: boolean = await Treasure.exists({ code: code })
          console.log("userIsCreator", userIsCreator)
          console.log("code7", code)
          //trying to create a treasure
          if (userIsCreator && !treasureExists) {
            const { treasure, createStep } = await prepareSetup(ctx, code)
            session.treasure = treasure
            session.createStep = createStep
            return
          }
          else {
            session.code = code
            if (await prepareCollection(ctx)) {
              return claimNftMiddleware.replyToContext(ctx)
            }
          }
        }
      }
    }
  })

  /*
   *   /menu command handler
   */
  bot.command("menu", async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
      await resetSession(ctx)
      const message = "Here you go"
      await ctx.reply(
        message,
        {
          reply_markup: {
            keyboard: (await getKeyboard(ctx)).build(),
            resize_keyboard: true
          },
          parse_mode: "Markdown",
        }
      )
    }
  })

  /*
   *   /stats command handler
   */
  const antispamOn = {}
  bot.command("stats", async (ctx: CustomContext) => {
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
   *   React bot on 'Back to main menu' message
   */

  bot.hears("\u2B05 Back to main menu", async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
      await resetSession(ctx)
      const session = await ctx.session
      session.menu = "main"
      const message = "Welcome home 🏠"
      await ctx.reply(
        message,
        {
          reply_markup: {
            keyboard: (await getKeyboard(ctx)).build(),
            resize_keyboard: true
          },
          parse_mode: "Markdown",
        }
      )
    }
  })

 /*
  *   Handle callback query data: could be cancel setup event from router
  */
  bot.on("callback_query:data", async (ctx: CustomContext, next) => {
    if (ctx.update.callback_query.data === "Cancel Setup") {
      const session = await ctx.session
      session.createStep = ""
      await ctx.answerCallbackQuery()
      const message = "Setup Canceled"
      await ctx.reply(message, {
        reply_markup: {
          keyboard: (await getKeyboard(ctx)).build(),
          resize_keyboard: true
        },
      })
    }
    console.log("Unknown button event with payload", ctx.callbackQuery.data);
    await ctx.answerCallbackQuery(); // remove loading animation
    return next()
  })
  //order important! 
  bot.use(createRouter)

  bot.use(finderComposer)

  /*
   *   Collect and show in console all bot errors
   */
  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Could not contact Telegram:", e);
    } else {
      console.error("Unknown error:", e);
    }
  });
  bot.start()
  console.log(new Date(), "Bot started as", bot)
  return bot
}
