import { botParams } from "../../config.js"
import _ from "lodash"
import { Markup } from "telegraf"
import { amountToHumanString, bigNumberArithmetic, bigNumberComparison } from "../wallet/walletHelpers.js"
import BigNumber from "bignumber.js"
import User, { IUser } from "../models/user.js"
import { sendAndFinalize } from "../../tools/remarkUtils.js"
import { CodecHash } from "@polkadot/types/interfaces";

export interface IGetTransactionCost {
  type: string,
  recipient: string,
  toSendAmount?: string,
  toSendRemarks?: Array<string>
}


const alreadyReceived = new Map()

export const deposit = async (record, currentBlock: number) => {
  console.log("record", record)
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
  var allUsers: Array<IUser> = await User.find().exec()
  var users: Array<IUser> = allUsers.filter(
    (eachUser: IUser) => eachUser.wallet.address === from)
  var verifiedUsers: Array<IUser> = users.filter(eachUser => eachUser.wallet.linked === true)
  var user: IUser
  var message: string = ""
  if (users.length === 1) {
    user = users[0]
  }
  if (user && !user.wallet.linked) {
    //transfer amount matches password && password not expired yet
    if (new BigNumber(user.wallet.password).isEqualTo(new BigNumber(value))
      && user.wallet.password_expiry >= new Date()) {
      user.wallet.linked = true
      message = "Your wallet has been successfully linked	\u2705 to your account! " +
        "Any deposits you make from that wallet to the deposit address of this bot will now automatically " +
        "be credited to this account. When collecting treasures, the respective NFTs will also be sent " +
        "to the linked wallet.\n" +
        "As a precaution, please still always check your wallet's status *BEFORE* depositing to ensure " +
        "your wallet is still linked to your account!\nYou can now use the bot to create " +
        "and collect treasures! Have fun.\n\n"
    }
    //pasword not matching and password expired
    else if (!new BigNumber(user.wallet.password).isEqualTo(new BigNumber(value))
      && user.wallet.password_expiry < new Date()) {
      withdraw(from.toString(), value)
      message = "You did not make the deposit on time (15 minutes), neither did you transfer the right amount. " +
        "Your transfer has been sent back to the wallet it came from (minus transaction fees)." +
        "Click on '🔗 Link address' in " +
        "the menu again to see the requirements."
    }
    //password expired
    else if (user.wallet.password_expiry < new Date()) {
      withdraw(from.toString(), value)
      message = "You did not make the transfer within the required time of 15 minutes. It has been sent back to you " +
        "(minus transaction fees).\nClick on '🔗 Link address' in " +
        "the menu again to see the requirements."
    }
    //wrong password
    else {
      withdraw(from.toString(), value)
      message = "You have transferred the wrong amount (wrong password). Your transfer has been sent back to you " +
        "(minus transaction fees).\nClick on '🔗 Link address' in " +
        "the menu again to see the requirements."
    }
  }
  //account was linked with an already taken address -> inform affected users.
  else if (users.length > 1) {
    user = checkPasswordMatch(users, value)
    if (user) {
      for (const vUser of verifiedUsers) {
        var alert = `\u26A0Your wallet ${vUser.wallet.address} has just been linked with another account.\u26A0 ` +
          `It is *NO LONGER LINKED* to this account. You MUST relink a wallet (different or same) with this account BEFORE ` +
          `depositing. Otherwise your funds will be credited to another account!!!`
        await botParams.bot.telegram.sendMessage(vUser.chat_id, alert)
        vUser.wallet.linked = false
        await vUser.save()
      }
      user.wallet.linked = true
      await user.save()
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
  else if (!user || users.length === 0) {
    //send money back
    //no entry found
    withdraw(from.toString(), value)
  }

  if (user) {
    if (user.wallet.linked) {
      user.wallet.balance = bigNumberArithmetic(user.wallet.balance, value, "+")
      await user.save()
      message += `${humanVal} have been credited to your account.`
    }
    await botParams.bot.telegram
      .sendMessage(user.chat_id, message, Markup.inlineKeyboard(links))
  }
}

function findNewlyAdded(users: Array<IUser>) {
  return users.reduce((prev: IUser, curr: IUser) => {
    return prev.wallet.date_of_entry < curr.wallet.date_of_entry ? curr : prev
  })
}

function checkPasswordMatch(users: Array<IUser>, transferAmount: string): IUser {
  return users.find((eachUser: IUser) => new BigNumber(eachUser.wallet.password)
    .isEqualTo(new BigNumber(transferAmount)) &&
    eachUser.wallet.password_expiry >= new Date())
}

async function withdraw(recipient: string, value: string): Promise<any> {
  //get estimation of transfer cost
  let info = await getTransactionCost({ type: "transfer", recipient: recipient, toSendAmount: value })
  //deduct fee from amount to be sent back
  var transferAmount = bigNumberArithmetic(value, info.partialFee, "-")

  //send back if (amount - fee) is +ve
  if (bigNumberComparison(transferAmount, "0", ">")) {
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

export const mintAndSend = async (remarks: Array<string>,
  user: IUser): Promise<{
    block?: number
    success: boolean
    hash?: CodecHash
    fee?: string
    topupRequired?: boolean
  }> => {
  let info = await getTransactionCost({
    type: "nft",
    recipient: user.wallet.address,
    toSendRemarks: remarks
  })
  var ableToCover: boolean = user.mintAllowed(
    bigNumberArithmetic(info.partialFee.toString(), botParams.settings.creatorReward, "+"))
  if (!ableToCover) {
    return { success: false, topupRequired: true }
  }

  const txs = []
  for (const remark of remarks) {
    txs.push(botParams.api.tx.system.remark(remark));
  }
  try {
    const batch = botParams.api.tx.utility.batchAll(txs);
    const { block, hash, success } = await sendAndFinalize(batch, botParams.account);
    return { block, success, hash, fee: info.partialFee }
  }
  catch (error) {
    //write error to console
    console.error(error)
    return { success: false }
  }
}

//pass in if its transfer or remark type
async function getTransactionCost({
  type,
  recipient,
  toSendAmount,
  toSendRemarks }: IGetTransactionCost): Promise<any> {
  if (type === "transfer") {
    //estimate fee for transfer back
    const value = toSendAmount
    let info = await botParams.api.tx.balances
      .transfer(recipient, value)
      .paymentInfo(botParams.account.address)
    return info
  }
  else if (type === "nft") {
    //get mint and transfer cost
    const remarks = toSendRemarks
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
    return "error"
  }
}

export {
  alreadyReceived,
  withdraw,
  getTransactionCost,
}
