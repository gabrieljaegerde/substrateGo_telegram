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
import prom from "./metrics.js"
import _ from "lodash"
import LocalSession from 'telegraf-session-local'
import { editNFT } from "./src/nft/editNFT.js"
import { createTreasureGuideMiddleware } from "./src/treasure/creator/createTreasureGuide.js"

const telegramBotUpdates = new prom.Counter({
  name: "substrate_bot_telegram_updates",
  help: "metric_help",
})

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
        message = `Welcome to the ${botParams.settings.network.name}Go bot.` +
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
            "QR Codes. What you just found is a treasure of a world wide treasure hunt!!! A " +
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
          maxLimit: 100,
          hunter: true,
          blocked: false,
          timestamp: new Date()
        }
        botParams.db.chain.get("users").push(user).value()
        botParams.db.write()
        //todo: commence with nft generation process
        //save treasure and let user claim unclaimed later
        //ctx.session.qr = code
        //getTreasure.replyWithMarkdown(ctx, "")
        //getTreasure(code)
        fastTrackGet(ctx, qrId)
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
          maxLimit: 100,
          hunter: true,
          blocked: false,
          timestamp: new Date()
        }
        botParams.db.chain.get("users").push(user).value()
        botParams.db.write()
      }
      ctx.replyWithMarkdown(
        message,
        Markup.keyboard(getKeyboard(ctx)).resize()
      )
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
   *   React bot on 'Collect treasure' message
   */

  bot.hears("\uD83D\uDCF7 Collect treasure", ctx => {
    if (ctx.chat.type == "private") {
      collectTreasure(ctx)
    }
  })

  /*
   *   React bot on 'View balance' message
   */

  bot.hears("View balance", async ctx => {
    if (ctx.chat.type == "private") {
      botParams.db.read()
      botParams.db.chain = _.chain(botParams.db.data)
      let userWallet = botParams.db.chain
        .get("users")
        .find({ chatid: ctx.chat.id })
        .get("wallet").value()
      let reply = await getAccountDetails(userWallet)
      ctx.replyWithMarkdown(
        reply,
        Markup.keyboard(getKeyboard(ctx)).resize()
      )
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
   *   React bot on 'My addresses/alerts' message
   */
  bot.hears("\uD83D\uDCEA Edit address", ctx => {
    if (ctx.chat.type == "private") {
      addWallet(ctx)
      //addWalletMiddleware.setSpecific(ctx)
    }
  })

  bot.hears("\uD83D\uDCEA Add address", ctx => {
    if (ctx.chat.type == "private") {
      addWallet(ctx)
      //addWalletMiddleware.setSpecific(ctx)
    }
  })

  bot.hears("Add address", ctx => {
    if (ctx.chat.type == "private") {
      addWallet(ctx)
      //addWalletMiddleware.setSpecific(ctx)
    }
  })

  bot.hears("\uD83C\uDF81 My treasures", ctx => {
    if (ctx.chat.type == "private") {
      listScannedMiddleware.replyToContext(ctx)
    }
  })

  bot.hears("\uD83E\uDDFE Withdraw balance", ctx => {
    if (ctx.chat.type == "private") {
      ctx.session.addressChange = false
      withdrawBalanceMiddleware.replyToContext(ctx)
    }
  })

  bot.hears("Link address", ctx => {
    if (ctx.chat.type == "private") {
      linkAddress(ctx)
    }
  })

  bot.hears("\u26A0 Deposit \u26A0", ctx => {
    if (ctx.chat.type == "private") {
      depositMiddleware.replyToContext(ctx)
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

  /*
   *   React bot on 'Network stats' message
   */
  bot.hears("Network stats", async ctx => {
    if (ctx.chat.type == "private") {
      //ctx.replyWithMarkdown(botParams.getNetworkStatsMessage())
    }
  })

  bot.hears("\u270F Edit treasures", async ctx => {
    if (ctx.chat.type == "private") {
      listCreatedMiddleware.replyToContext(ctx)
    }
  })

  bot.use(listCreatedMiddleware)

  bot.use(listCollectedMiddleware)

  bot.use(listScannedMiddleware)

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

  bot.hears("\uD83D\uDEE0 Account Settings", async ctx => {
    if (ctx.chat.type == "private") {
      ctx.session.menu = "account"
      await ctx.reply(
        "Welcome to your Account Settings. Let me give you some quick info.",
        Markup.keyboard(getKeyboard(ctx)).resize()
      )
      depositMiddleware.replyToContext(ctx)
    }
    /*
    if (ctx.chat.type == "private") {
      ctx.session.menu = "account"
      botParams.db.read()
      botParams.db.chain = _.chain(botParams.db.data)
      let userWallet = botParams.db.chain
        .get("users")
        .find({ chatid: ctx.chat.id })
        .get("wallet").value()
      var reply = `Welcome to your account settings. Here you can manage all things ` +
        `related to your account. \n\nA few quick details regarding your account:\n\n` +
        `Your account currently has a blanace of ${userWallet.balance} ${botParams.settings.network.token} \n\n`
      if (userWallet.linked) {
        reply += `The ${botParams.settings.network.name} address linked to your account is:\n` +
          `${userWallet.address}. It is safe for you to make transfers from this address to the bots ` +
          "deposit address `" + process.env.DEPOSIT_ADDRESS + "`"
      }
      else {
        reply += `Your account is NOT linked to a ${botParams.settings.network.name} address at the moment. ` +
          `Any deposits you make to the bot's deposit address, will NOT be credited to your account and ` +
          `could potentially be lost. Please link your account to a ${botParams.settings.network.name} address ` +
          `before making a deposit.`
      }
      ctx.reply(
        reply,
        Markup.keyboard(getKeyboard(ctx)).resize()
      )
    }*/
  })

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
   *   React bot on 'Switch to hunted mode' message.
   */
  bot.hears("\u2B05 Switch to creator mode", async ctx => {
    if (ctx.chat.type == "private") {
      botParams.db.read()
      //var user = botParams.db.data.users.find(({ chatid }) => chatid === ctx.chat.id)
      //user.hunter = false
      botParams.db.chain = _.chain(botParams.db.data)
      var user = botParams.db.chain
        .get("users")
        .find({ chatid: ctx.chat.id })
        .assign({ hunter: false }).value()
      botParams.db.write()
      ctx.reply(
        "You have now switched to creator mode. Here you can create new treasures, edit them " +
        "and track their performance. Each time a user collects your treasures, you receive a " +
        "small reward. Go create awesome treasures and earn!",
        Markup.keyboard(getKeyboard(ctx)).resize()
      )
    }
  })

  /*
   *   React bot on 'Switch to hunter mode' message.
   */
  bot.hears("Switch to finder mode \u27A1", async ctx => {
    if (ctx.chat.type == "private") {
      botParams.db.read()
      //var user = botParams.db.data.users.find(({ chatid }) => chatid === ctx.chat.id)
      //user.hunter = true
      botParams.db.chain = _.chain(botParams.db.data)
      var user = botParams.db.chain
        .get("users")
        .find({ chatid: ctx.chat.id })
        .assign({ hunter: true }).value()
      botParams.db.write()
      ctx.reply(
        "You have now switched to finder mode. Here you can find all the tools to find and claim " +
        "treasures.",
        Markup.keyboard(getKeyboard(ctx)).resize()
      )
    }
  })

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
  bot.use((ctx, next) => {
    if (ctx.callbackQuery) {
      //console.log('callback data just happened', ctx.callbackQuery.data)
    }
    return next()
  })

  bot.use(editWalletMiddleware)

  bot.use(listNonCollectedMiddleware)

  bot.use(withdrawBalanceMiddleware)

  bot.use(claimNftMiddleware)

  //bot.use(withdrawBalanceMiddleware)

  bot.use(enterAddress.middleware())

  //menu.init()?
  await bot.launch()
  console.log(new Date(), "Bot started as", bot.botInfo.username)
  return bot
}
