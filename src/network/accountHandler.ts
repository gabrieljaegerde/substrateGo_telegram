import { botParams } from "../../config.js"
import { amountToHumanString, bigNumberArithmetic, bigNumberComparison } from "../../tools/utils.js"
import User, { IUser } from "../models/user.js"
import { allowWithdrawal, sendAndFinalize } from "../../tools/substrateUtils.js"
import { InlineKeyboard } from "grammy"

export const alreadyReceived = new Map()

export const deposit = async (record, currentBlock: number) => {
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
  const from = event.data[0].toString()
  const value = event.data[2].toString()
  const humanVal = amountToHumanString(value)
  //make sure value is not null/undefined
  console.log("from", from)
  const allUsers: Array<IUser> = await User.find().exec()
  const users: Array<IUser> = allUsers.filter(
    (eachUser: IUser) => eachUser.wallet && eachUser.wallet.address === from)
  const verifiedUsers: Array<IUser> = users.filter(eachUser => eachUser.wallet && eachUser.wallet.linked === true)
  let user: IUser
  let message = ""
  if (users.length === 1) {
    user = users[0]
  }
  console.log("user", user)
  if (user && !user.wallet.linked) {
    //transfer amount matches password && password not expired yet
    const pwordMatch = bigNumberComparison(user.wallet.password, value, "=")
    const pwordExpired = user.wallet.passwordExpired()
    if (pwordMatch && !pwordExpired) {
      user.wallet.linked = true
      message = "Your wallet has been successfully linked	\u2705 to your account!\n\n" +
        "Any deposits you make from that wallet to the deposit address of this bot will now automatically " +
        "be credited to this account. When collecting treasures, the respective NFTs will also be sent " +
        "to the linked wallet.\n\n" +
        "_As a precaution, please still always check your wallet's status *BEFORE* depositing to ensure " +
        "your wallet is still linked to your account!_\n\nYou can now use the bot to *create* " +
        "and *collect* treasures! *Have fun.*\n\n"
    }
    //pasword not matching and password expired
    else if (!pwordMatch && pwordExpired) {
      withdraw(from.toString(), value)
      message = "You did not make the deposit on time (15 minutes), neither did you transfer the right amount. " +
        "Your transfer has been sent back to the wallet it came from (minus transaction fees)." +
        "Click on '🔗 Link address' in " +
        "the menu again to see the requirements."
    }
    //password expired
    else if (pwordExpired) {
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
        const alert = `\u26A0Your wallet ${vUser.wallet.address} has just been linked with another account.\u26A0 ` +
          `It is *NO LONGER LINKED* to this account. You MUST relink a wallet (different or same) with this account BEFORE ` +
          `depositing. Otherwise your funds will be credited to another account!!!`
        await botParams.bot.api
          .sendMessage(vUser.chatId, alert, { parse_mode: "MarkdownV2" })
        vUser.wallet.linked = false
        await vUser.save()
      }
      user.wallet.linked = true
      await user.save()
      message = "Your wallet has been successfully linked	\u2705 to your account!\n\n" +
        "Any deposits you make from that wallet to the deposit address of this bot will now automatically " +
        "be credited to this account. When collecting treasures, the respective NFTs will also be sent " +
        "to the linked wallet.\n\n" +
        "_As a precaution, please still always check your wallet's status *BEFORE* depositing to ensure " +
        "your wallet is still linked to your account!_\n\nYou can now use the bot to *create* " +
        "and *collect* treasures! *Have fun.*\n\n"
    }
    //shouldn't happen
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
    const inlineKeyboard = new InlineKeyboard()
    botParams.settings
      .getExtrinsicLinksBlock(
        botParams.settings.network.name,
        phase.value["toNumber"] && phase.value.toNumber() < 1000
          ? phase.value.toNumber()
          : null,
        currentBlock
      )
      .map(row => {
        return row.map(link => {
          inlineKeyboard.url(link[0], link[1])
        })
      })
    await botParams.bot.api
      .sendMessage(user.chatId, message, { reply_markup: inlineKeyboard, parse_mode: "Markdown" })
  }
}

const findNewlyAdded = (users: Array<IUser>) => {
  return users.reduce((prev: IUser, curr: IUser) => {
    return prev.wallet.passwordExpiry < curr.wallet.passwordExpiry ? curr : prev
  })
}

const checkPasswordMatch = (users: Array<IUser>, transferAmount: string): IUser => {
  return users.find((eachUser: IUser) =>
    bigNumberComparison(eachUser.wallet.password, transferAmount, "=") &&
    !eachUser.wallet.passwordExpired())
}

export const withdraw = async (recipientAddress: string, value: string, recipient?: IUser): Promise<{
  block?: number
  success: boolean
  hash?: string
}> => {
  //get estimation of transfer cost
  const info = await getTransactionCost("transfer", recipientAddress, value)
  //deduct fee from amount to be sent back
  const transferAmount = bigNumberArithmetic(value, info.partialFee, "-")

  const users: Array<IUser> = await User.find({})
  const allowed = await allowWithdrawal(botParams.api, value, users, recipient)
  if (!allowed) {
    console.log(`Sth fishy going on!\n\n` +
      `Account Balances don't add up in withdrawal!!!\n\n` +
      `User: ${recipient}\n\n` +
      `Withdrawal Amount: ${value}\n\n` +
      `Users: ${users}`)
    await botParams.bot.api
      .sendMessage(botParams.settings.adminChatId, `Account Balances don't add up in withdrawal!!!\n\n` +
        `User: ${recipient ? recipient._id : recipient}\n\n` +
        `Withdrawal Amount: ${value}\n\n` +
        `User Balance: ${recipient ? recipient.getBalance() : recipient}`)
    return { success: false }
  }
  //send back if (amount - fee) is +ve
  if (bigNumberComparison(transferAmount, "0", ">")) {
    try {
      const tx = botParams.api.tx.balances.transfer(recipientAddress, transferAmount)
      const { block, hash, success } = await sendAndFinalize(tx, botParams.account);
      return { block, success, hash }
    }
    catch (error) {
      //write error to logs
      console.error(error)
      return { success: false }
    }
  }
  //throw into charity pool
  else {
    const charityAccount: IUser = await User.findOne({ char_id: botParams.settings.charityChatId })
    charityAccount.totalRewardBalance = bigNumberArithmetic(charityAccount.totalRewardBalance, value, "+")
    charityAccount.save()
    const message = `Attempt transfer to ${recipientAddress} an amount of: ${value}. The fee was higher ` +
      `than the transaction amount: ${info.partialFee}`
    console.log(message)
    return { success: false }
  }
}

export const mintAndSend = async (remarks: Array<string>,
  user: IUser): Promise<{
    block?: number
    success: boolean
    hash?: string
    fee?: string
    topupRequired?: boolean
  }> => {
  const info = await getTransactionCost(
    "nft",
    user.wallet.address,
    null,
    remarks
  )
  const totalCost = bigNumberArithmetic(info.partialFee, botParams.settings.creatorReward, "+")
  const ableToCover: boolean = user.mintAllowed(totalCost)
  if (!ableToCover) {
    return { success: false, topupRequired: true, fee: totalCost }
  }
  const users: Array<IUser> = await User.find({})
  const allowed = await allowWithdrawal(botParams.api, totalCost, users, user)
  if (!allowed) {
    console.log(`Sth fishy going on!\n\n` +
      `Account Balances don't add up in NFT claim!!!\n\n` +
      `User: ${user}\n\n` +
      `Total Cost: ${totalCost}\n\n` +
      `Users: ${users}`)
    await botParams.bot.api
      .sendMessage(botParams.settings.adminChatId, `Account Balances don't add up in NFT claim!!!\n\n` +
        `User: ${user ? user._id : user}\n\n` +
        `Total Cost: ${totalCost}\n\n` +
        `User Balance: ${user ? user.getBalance() : user}`)
    return { success: false }
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
export const getTransactionCost = async (
  type: string,
  recipient: string,
  toSendAmount?: string,
  toSendRemarks?: Array<string>): Promise<any> => {
  if (type === "transfer") {
    //estimate fee for transfer back
    const value = toSendAmount
    const info = await botParams.api.tx.balances
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
    return "error"
  }
}
