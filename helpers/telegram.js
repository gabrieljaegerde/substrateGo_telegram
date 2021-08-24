import { botParams } from "../config.js"
import prom from "../metrics.js"
import { Markup } from "telegraf"

const sentMessagesSuccessCounter = new prom.Counter({
  name: "substrate_bot_sent_messages_success",
  help: "metric_help",
})
const sentMessagesErrorCounter = new prom.Counter({
  name: "substrate_bot_sent_messages_error",
  help: "metric_help",
})

export const send = async (id, message, links) => {
  try {
    await botParams.bot.telegram
      .sendMessage(id, message, {
        parse_mode: "html",
        disable_web_page_preview: "true",
        reply_markup: Markup.inlineKeyboard(links),
      })
    sentMessagesSuccessCounter.inc()
  }
  catch(error){
    sentMessagesErrorCounter.inc()
    if (error.message.includes("bot was blocked by the user")) {
      botParams.db
        .get("users")
        .find({ chatid: id })
        .assign({ enabled: false, blocked: true })
        .write()
      console.log(new Date(), `Bot was blocked by user with chatid ${id}`)
      return
    }
    console.log(new Date(), error)
  }
}
