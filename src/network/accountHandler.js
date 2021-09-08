import { botParams, getKeyboard } from "../../config.js"
import _ from "lodash"
import { checkFilter } from "../../tools/utils.js"
import * as telegram from "../../helpers/telegram.js"
import { Markup } from "telegraf"
import { amountToHumanString } from "../wallet/helpers.js"

const alreadyReceived = new Map()

async function deposit(record, currentBlock) {
  if (
    alreadyReceived.get(
      record.hash.toHuman ? record.hash.toHuman() : record.hash.toJSON()
    )
  ) {
    return alreadyReceived.set(
      record.hash.toHuman ? record.hash.toHuman() : record.hash.toJSON(),
      new Date()
    )
  }
  const { event, phase } = record
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  var from = event.data[0].toString()
  var value = event.data[2].toString()
  var humanVal = amountToHumanString(value)
  //make sure value is not null/undefined
  var links = botParams.settings
    .getExtrinsicLinksBlock(
      botParams.settings.network.name,
      phase.value["toNumber"] && phase.value.toNumber() < 1000
        ? phase.value.toNumber()
        : null,
      currentBlock
    )
    .map(row => {
      console.log("row", row)
      return row.map(link => {
        return Markup.button.url(link[0], link[1])
      })
    })



  // await botParams.bot.telegram
  // .sendMessage(id, message, {
  //   parse_mode: "html",
  //   disable_web_page_preview: "true",
  //   reply_markup: Markup.inlineKeyboard(links),
  // })
  var users = botParams.db.data.users.filter(
    eachUser => eachUser.wallet.address === from)
  var verifiedUsers = users.filter(eachUser => eachUser.wallet.linked === true)
  var user
  var message = ""

  if (users.length === 1) {
    user = users[0]
  }
  if (users.length === 1 && !users[0].wallet.linked) {
    //transfer amount matches password && password not expired yet
    if (users[0].wallet.password.toString() === value && new Date(users[0].wallet.expiry) >= new Date()) {
      user = users[0]
      user.wallet.linked = true
      message = "Your wallet has been successfully linked	\u2705 to your account! " +
        "Any deposits you make from that wallet to the deposit address of this bot will now automatically " +
        "be credited to this account. " +
        "As a precaution, please still always check your wallet's status *BEFORE* depositing to ensure " +
        "your wallet is still linked to your account!\nYou can now use the bot to create " +
        "and collect treasures! Have fun.\n\n"
    }
    else if (!users[0].wallet.password.toString() === value && !new Date(users[0].wallet.expiry) >= new Date()) {
      withdraw(from.toString(), value)
      message = "You did not make the deposit on time (15 minutes), neither did you transfer the right amount. " +
        "Your transfer has been sent back to the wallet it came from (minus transaction fees)." +
        "Click on '\u26A0 Deposit \u26A0' in " +
        "the menu again to see the requirements."

    }
    else if (new Date(users[0].wallet.expiry) < new Date()) {
      withdraw(from.toString(), value)
      message = "You did not make the transfer within the required time of 15 minutes. It has been sent back to you " +
        "(minus transaction fees).\nClick on '\u26A0 Deposit \u26A0' in " +
        "the menu again to see the requirements."
    }
    else {
      withdraw(from.toString(), value)
      message = "You have transferred the wrong amount. Your transfer has been sent back to you " +
        "(minus transaction fees).\nClick on '\u26A0 Deposit \u26A0' in " +
        "the menu again to see the requirements."
    }
  }
  //account was linked with an already linked wallet -> inform affected users.
  else if (users.length > 1) {
    user = checkPasswordMatch(users, value)
    if (user) {
      for (const vUser of verifiedUsers) {
        var alert = `\u26A0Your wallet ${vUser.wallet.address} has just been linked with another account.\u26A0 ` +
          `It is *NO LONGER LINKED* to this account. You MUST relink a wallet (different or same) with this account BEFORE ` +
          `depositing. Otherwise your funds will be credited to another account!!!`
        await botParams.bot.telegram.sendMessage(vUser.chatid, alert)
        vUser.wallet.linked = false
      }
      user.wallet.linked = true
      message = "Your wallet has been successfully linked	\u2705 to your account! " +
        "Any deposits you make from that wallet to the deposit address of this bot will now automatically " +
        "be credited to this account. " +
        "As a precaution, please still always check your wallet's status *BEFORE* depositing to ensure " +
        "your wallet is still linked to your account!\nYou can now use the bot to create " +
        "and collect treasures! Have fun.\n\n"
    }
    else if (!user && verifiedUsers.length > 0) {
      user = findNewlyAdded(verifiedUsers)
    }
    //multiple users but non verified and non with matching password -> send back
    else {
      withdraw(from.toString(), value)
    }
  }
  else {
    //send money back
    //no entry found
    withdraw(from.toString(), value)
  }

  if (user) {
    if (user.wallet.linked) {
      var newBalance = parseInt(user.wallet.balance) + parseInt(value)
      user.wallet.balance = newBalance
      botParams.db.write()
      message += `${humanVal} have been credited to your account.`
    }
    await botParams.bot.telegram
      .sendMessage(user.chatid, message, Markup.inlineKeyboard(links))
  }
}

function findNewlyAdded(users) {
  return users.reduce((res, user) => {
    const created = user.wallet.timestamp
    return created > res.timestamp ? { user, timestamp } : res
  }, { user: null, timestamp: 0 }).user
}

function checkPasswordMatch(users, transferAmount) {
  return users.find(eachUser => eachUser.wallet.password.toString() === transferAmount &&
    new Date(eachUser.wallet.expiry) >= new Date())
}

//run this function after deposit to prevent account from overfilling
function checkBalance() {

  //const now = await botParams.api.query.timestamp.now()
  //const { data: balance } = await botParams.api.query.system.account(botParams.settings.depositAddress)
  //if balance.free>1, send to another account
}

async function withdraw(recipient, value) {
  //get estimation of transfer cost
  let info = await getTransactionCost("transfer", recipient, value)
  //deduct fee from amount to be sent back
  var transferAmount = parseInt(value) - parseInt(info.partialFee)

  //send back if (amount - fee) is +ve
  if (transferAmount > 0) {
    try {
      const txHash = await botParams.api.tx.balances
        .transfer(recipient, transferAmount)
        .signAndSend(botParams.account)
      return { success: true, response: txHash }
    }
    catch (error) {
      //write error to logs
      console.log(error)
      return { success: false, response: null }
    }
  }
  //throw into charity pool
  else {
    //log this to logs
    let message = `Attempt transfer to ${recipient} an amount of: ${value}. The fee was higher ` +
      `than the transaction amount: ${info.partialFee}`
    console.log(message)
    return { success: false, response: message }
  }
}

async function mintAndSend(remarks, user) {
  const txs = []
  for (const remark of remarks) {
    txs.push(botParams.api.tx.system.remark(remark));
  }
  let info = await getTransactionCost("nft", user.wallet.address, remarks)
  var ableToCover = parseInt(user.wallet.balance) > parseInt(info.partialFee)
  if (!ableToCover) {
    //await botParams.bot.telegram.sendMessage(user.chatid, message)
    return { success: false, response: "topup" }
  }
  try {
    const txHash = await botParams.api.tx.utility
      .batchAll(txs)
      .signAndSend(botParams.account)
    return { success: true, response: txHash, fee: info.partialFee }
  }
  catch (error) {
    //write error to logs
    console.log(error)
    return { success: false, response: null }
  }
}

//pass in if its transfer or remark type
async function getTransactionCost(type, recipient, toSend) {
  if (type === "transfer") {
    //estimate fee for transfer back
    const value = toSend
    let info = await botParams.api.tx.balances
      .transfer(recipient, value)
      .paymentInfo(botParams.account.address)
    return info
  }
  else if (type === "nft") {
    //get mint and transfer cost
    const remarks = toSend
    const txs = []
    for (const remark of remarks) {
      txs.push(botParams.api.tx.system.remark(remark));
    }
    const info = await botParams.api.tx.utility
      .batchAll(txs)
      .paymentInfo(botParams.account.address)
    return info
  }
  else {
    //todo:log and error that says wrong type and tell user to try again later
    return error
  }
}

export {
  alreadyReceived,
  deposit,
  withdraw,
  getTransactionCost,
  mintAndSend,
}
