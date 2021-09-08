import { Telegraf, Markup } from "telegraf"
import { botParams, getKeyboard } from "./config.js"
import { addWallet } from "./src/wallet/add.js"
import { editWalletMiddleware, enterAddress } from "./src/wallet/edit.js"
import { getAccountDetails } from "./src/wallet/helpers.js"
import { withdrawBalanceMiddleware } from "./src/wallet/withdraw.js"
import { depositMiddleware, linkAddress } from "./src/wallet/deposit.js"
import { addTreasure, uploadQr } from "./src/treasure/creator/addTreasure.js"
import { listScannedMiddleware } from "./src/treasure/finder/listScanned.js"
import { listCreatedMiddleware } from "./src/treasure/creator/listCreated.js"
import { editMessage } from "./src/treasure/creator/editMessage.js"
import { editNameTreasure } from "./src/treasure/creator/editNameTreasure.js"
import { editNameScanned } from "./src/treasure/finder/editNameScanned.js"
import { claimNftMiddleware } from "./src/nft/claimNft.js"
import { collectTreasure, getTreasure } from "./src/treasure/finder/collectTreasure.js"
import { createTreasureMiddleware } from "./src/treasure/creator/createTreasure.js"
import { listCollectedMiddleware } from "./src/treasure/finder/listCollected.js"
import { listNonCollectedMiddleware } from "./src/treasure/finder/listNonCollected.js"
//import prom from "./metrics.js"
import _ from "lodash"
import { fastTrackGet } from "./src/treasure/finder/collectTreasure.js"
import LocalSession from 'telegraf-session-local'
import { editNFT } from "./src/nft/editNFT.js"
import { createTreasureGuideMiddleware } from "./src/treasure/creator/createTreasureGuide.js"

// const telegramBotUpdates = new prom.Counter({
//   name: "substrate_bot_telegram_updates",
//   help: "metric_help",
// })

export const run = async function (params) {
  /*
   *   BOT initialization
   */
  const bot = new Telegraf(botParams.settings.botToken)
  bot.use((new LocalSession({ database: process.env.LOCAL_STORAGE_DB_FILE_PATH })).middleware())

  /*
   *   Message on command /start (Hello msg)
   */
  bot.start(async ctx => {
    if (ctx.chat.type == "private") {
      botParams.db.read()
      botParams.db.chain = _.chain(botParams.db.data)
      var user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
      var message
      //normal start
      if (ctx.message.text === "/start") {
        message = `Welcome to the ${botParams.settings.network.name}Go bot. This bot is ` +
          `the central part of the ${botParams.settings.network.name}Go game: a treasure hunt game ` +
          "running on the blockchain.\nIf you are familiar with geo-caching or PokemonGo, then " +
          "this game is similar to that.\n\n" +
          "With this bot you can create treasures and hide them all around the world for others " +
          "to find.\nYou can of course also collect treasures. Whenever you collect a treasure an " +
          "NFT gets created that proves your ownership of the treasure.\n\n" +
          "There are no fees to use this bot except the automatic network fees.\n" +
          "Under no circumstances shall the creators of this bot be held responsible " +
          "for lost, stolen or misdirected funds. Please use the bot with caution " +
          "and only ever transfer small amounts to the bots deposit wallet."
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
            "QR Codes. What you just found is a treasure of a world wide treasure hunt game!!! A " +
            "lucky bird you are... To claim this treasure($$$), we need to set up " +
            "your account first. \n\nClick here -> \/setup <- to get instructions " +
            "on how to do just that. Come and join the hunt!"
        }
        //the QR code id is sent in with the /start command.
        //seperate the id out
        var qrId = ctx.message.text.replace("/start", "").replace(/\s/g, "")
        user = {
          first_name: ctx.chat.first_name,
          username: ctx.chat.username,
          chatid: ctx.chat.id,
          type: ctx.chat.type,
          wallet: {},
          oldWallets: [],
          blocked: false,
          timestamp: new Date()
        }
        botParams.db.chain.get("users").push(user).value()
        botParams.db.write()
      }
      //if new user -> add to db
      if (!user) {
        user = {
          first_name: ctx.chat.first_name,
          username: ctx.chat.username,
          chatid: ctx.chat.id,
          type: ctx.chat.type,
          wallet: {},
          oldWallets: [],
          blocked: false,
          timestamp: new Date()
        }
        botParams.db.chain.get("users").push(user).value()
        await botParams.db.write()
      }
      await ctx.replyWithMarkdown(
        message,
        Markup.keyboard(getKeyboard(ctx)).resize()
      )      
      if (ctx.message.text !== "/start"){
        fastTrackGet(ctx, qrId)
      }
      return
    }
  })

  /*
   *   /menu command handler
   */
  bot.command("menu", async ctx => {
    if (ctx.chat.type == "private") {
      let reply = "Here you go"
      ctx.replyWithMarkdown(
        reply,
        Markup.keyboard(getKeyboard(ctx)).resize()
      )
    }
  })

  /*
   *   /stats command handler
   */
  const antispamOn = {}
  bot.command("stats", async ctx => {
    if (ctx.chat.type == "group" || ctx.chat.type == "supergroup") {
      if (!antispamOn[ctx.chat.id]) {
        antispamOn[ctx.chat.id] = true
        setTimeout(() => (antispamOn[ctx.chat.id] = false), 60000)
        //todo: send bot stats
        //refreshMenuMiddleware.setSpecific(ctx)
      } else {
        ctx.reply("Time limit 1 min for /stats command")
      }
    }
  })

  /*
   *   React bot on 'View stats' message
   */

  bot.hears("\uD83D\uDCCA View stats", ctx => {
    if (ctx.chat.type == "private") {
      botParams.db.read()
      botParams.db.chain = _.chain(botParams.db.data)
      var user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
      var userTreasures = botParams.db.chain.get("treasures").filter({ creator: ctx.chat.id }).value()
      var userTreasuresScanned = botParams.db.chain.get("scanned").each((item) => userTreasures.some(treasure => treasure.id === item.qrId)).value()
      var groupedScanned = _.groupBy(userTreasuresScanned, 'qrId')
      var groupedScannedLengths = []
      for (var treasure in groupedScanned) {
        console.log("treasure", treasure)
        console.log("userTreasures", userTreasures)
        console.log("userTreasures.find(treas => treas.id === treasure)", userTreasures.find(treas => treas.id === treasure))
        groupedScannedLengths.push({ name: userTreasures.find(treas => treas.id === treasure).name, length: groupedScanned[treasure].length })
      }
      console.log("gS", groupedScannedLengths)
      var message = "";
      if (userTreasuresScanned.length > 0) {
        message = `Your treasures have already been collected ${userTreasuresScanned.length} times.\n\n`
        groupedScannedLengths.forEach(function (item) {
          console.log(item)
          message += `Treasure ${item.name} was collected ${item.length} times.\n`
        })
      }
      else if (userTreasuresScanned.length == 0 && userTreasures.length > 0) {
        message = `Your treasures have not been collected yet.`
      }
      else {
        message = `You do not have any treasures yet. Go and create some today!`
      }
      ctx.replyWithMarkdown(
        message,
        Markup.keyboard(getKeyboard(ctx)).resize()
      )
      return
    }
  })

  /*
   *   React bot on 'Collect treasure' message
   */

  bot.hears("\uD83D\uDCF7 Collect treasure", ctx => {
    if (ctx.chat.type == "private") {
      collectTreasure(ctx)
    }
  })

  /*
   *   React bot on 'Create treasure' message
   */

  bot.hears("\uD83D\uDC8E Create treasure \uD83D\uDC8E", ctx => {
    if (ctx.chat.type == "private") {
      createTreasureMiddleware.replyToContext(ctx)
    }
  })

  /*
   *   React bot on 'Edit address' message
   */

  bot.hears("\uD83D\uDCEA Edit address", ctx => {
    if (ctx.chat.type == "private") {
      addWallet(ctx)
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

  bot.hears("\uD83C\uDF81 My treasures", ctx => {
    if (ctx.chat.type == "private") {
      listScannedMiddleware.replyToContext(ctx)
    }
  })

  /*
   *   React bot on 'Withdraw balance' message
   */

  bot.hears("\uD83E\uDDFE Withdraw balance", ctx => {
    if (ctx.chat.type == "private") {
      ctx.session.addressChange = false
      withdrawBalanceMiddleware.replyToContext(ctx)
    }
  })

  /*
   *   React bot on 'Link address' message
   */

  bot.hears("Link address", ctx => {
    if (ctx.chat.type == "private") {
      linkAddress(ctx)
    }
  })

  /*
   *   React bot on 'Deposit' message
   */

  bot.hears("\u26A0 Deposit \u26A0", ctx => {
    if (ctx.chat.type == "private") {
      depositMiddleware.replyToContext(ctx)
    }
  })

  /*
   *   React bot on 'Edit treasures' message
   */

  bot.hears("\u270F Edit treasures", async ctx => {
    if (ctx.chat.type == "private") {
      listCreatedMiddleware.replyToContext(ctx)
    }
  })

  /*
   *   React bot on 'Creator Mode' message
   */

  bot.hears("\uD83E\uDDD9\uD83C\uDFFB\u200D\u2640 Creator Mode", ctx => {
    if (ctx.chat.type == "private") {
      ctx.session.menu = "creator"
      ctx.reply(
        "You have entered creator mode. Here you can create new treasures, edit them " +
        "and track their performance. Each time a user collects your treasures, you receive a " +
        "small reward. Go create awesome treasures and earn!",
        Markup.keyboard(getKeyboard(ctx)).resize()
      )
    }
  })

  /*
   *   React bot on 'Finder Mode' message
   */

  bot.hears("\uD83D\uDD75\uD83C\uDFFE\u200D\u2642 Finder Mode", async ctx => {
    if (ctx.chat.type == "private") {
      ctx.session.menu = "finder"
      ctx.reply(
        "You have now entered finder mode. Here you can find all the tools to find and claim " +
        "treasures.",
        Markup.keyboard(getKeyboard(ctx)).resize()
      )
    }
  })

  /*
   *   React bot on 'Account Settings' message
   */
  var regex = new RegExp(/.*Account Settings.*/i)
  bot.hears(regex, async ctx => {
    if (ctx.chat.type == "private") {
      ctx.session.menu = "account"
      await ctx.reply(
        "Welcome to your Account Settings. Let me give you some quick info.",
        Markup.keyboard(getKeyboard(ctx)).resize()
      )
      depositMiddleware.replyToContext(ctx)
    }
  })

  /*
   *   React bot on 'Back to main menu' message
   */

  bot.hears("\u2B05 Back to main menu", ctx => {
    if (ctx.chat.type == "private") {
      ctx.session.menu = "main"
      ctx.reply(
        "Welcome home",
        Markup.keyboard(getKeyboard(ctx)).resize()
      )
    }
  })

  /*
   *   React bot on 'Find treasures' message
   */

  bot.hears("\uD83D\uDD0D Find treasures", ctx => {
    if (ctx.chat.type == "private") {
      ctx.reply(
        "In the future, clicking that button will bring you to a website that " +
        "shows a world map with markers of all the treasures. todo...",
        Markup.keyboard(getKeyboard(ctx)).resize()
      )
    }
  })

  bot.use(depositMiddleware)

  bot.use(createTreasureMiddleware)

  bot.use(createTreasureGuideMiddleware)

  bot.use(uploadQr.middleware())

  bot.use(editMessage.middleware())

  bot.use(editNameTreasure.middleware())

  bot.use(editNameScanned.middleware())

  bot.use(editNFT.middleware())

  bot.use(getTreasure.middleware())

  //bot.use(Telegraf.log())

  bot.use(listCreatedMiddleware)

  bot.use(listCollectedMiddleware)

  bot.use(listScannedMiddleware)

  bot.use(editWalletMiddleware)

  bot.use(listNonCollectedMiddleware)

  bot.use(withdrawBalanceMiddleware)

  bot.use(claimNftMiddleware)

  bot.use(enterAddress.middleware())

  /*
   *   Collect and show in console all bot errors
   *   except 'message is not modified' & 'message to edit not found'
   */
  bot.catch(error => {
    if (
      error.message.includes("message is not modified") ||
      error.message.includes("message to edit not found")
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
