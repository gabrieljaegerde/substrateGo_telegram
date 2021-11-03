import { botParams } from "../../config.js";
import { amountToHumanString, bigNumberArithmetic, bigNumberComparison, send } from "../../tools/utils.js";
import User, { IUser } from "../models/user.js";
import { allowWithdrawal, sendAndFinalize } from "../../tools/substrateUtils.js";
import { InlineKeyboard } from "grammy";
import { RuntimeDispatchInfo } from "@polkadot/types/interfaces";

export const alreadyReceived = new Map();

export const deposit = async (record, currentBlock: number): Promise<void> => {
  if (
    alreadyReceived.get(
      record.hash.toHuman ? record.hash.toHuman() : record.hash.toJSON()
    )
  ) {
    alreadyReceived.set(
      record.hash.toHuman ? record.hash.toHuman() : record.hash.toJSON(),
      new Date()
    );
    return;
  }
  const { event, phase } = record;
  const from = event.data[0].toString();
  const value = event.data[2].toString();
  const humanVal = amountToHumanString(value);
  //make sure value is not null/undefined
  const allUsers: IUser[] = await User.find().exec();
  const users: IUser[] = allUsers.filter(
    (eachUser: IUser) => eachUser.wallet && eachUser.wallet.address === from);
  const verifiedUsers: IUser[] = users.filter(eachUser => eachUser.wallet && eachUser.wallet.linked === true);
  let user: IUser;
  let message = "";
  if (users.length === 1) {
    user = users[0];
  }
  if (user && !user.wallet.linked) {
    //transfer amount matches password && password not expired yet
    const pwordMatch = bigNumberComparison(user.wallet.password, value, "=");
    const pwordExpired = user.wallet.passwordExpired();
    if (pwordMatch && !pwordExpired) {
      user.wallet.linked = true;
      message = "Your wallet has been successfully linked	\u2705 to your account!\n\n" +
        "Any deposits you make from that wallet to the deposit address of this bot will now automatically " +
        "be credited to this account. When collecting treasures, the respective NFTs will also be sent " +
        "to the linked wallet.\n\n" +
        "_As a precaution, please still always check your wallet's status *BEFORE* depositing to ensure " +
        "your wallet is still linked to your account!_\n\nYou can now use the bot to *create* " +
        "and *collect* treasures! *Have fun.*\n\n";
    }
    //pasword not matching and password expired
    else if (!pwordMatch && pwordExpired) {
      withdraw(from.toString(), value);
      message = "You did not make the deposit on time (15 minutes), neither did you transfer the right amount. " +
        "Your transfer has been sent back to the wallet it came from (minus transaction fees)." +
        "Click on '🔗 Link address' in " +
        "the menu again to see the requirements.";
    }
    //password expired
    else if (pwordExpired) {
      withdraw(from.toString(), value);
      message = "You did not make the transfer within the required time of 15 minutes. It has been sent back to you " +
        "(minus transaction fees).\nClick on '🔗 Link address' in " +
        "the menu again to see the requirements.";
    }
    //wrong password
    else {
      withdraw(from.toString(), value);
      message = "You have transferred the wrong amount (wrong password). Your transfer has been sent back to you " +
        "(minus transaction fees).\nClick on '🔗 Link address' in " +
        "the menu again to see the requirements.";
    }
  }
  //account was linked with an already taken address -> inform affected users.
  else if (users.length > 1) {
    user = checkPasswordMatch(users, value);
    if (user) {
      for (const vUser of verifiedUsers) {
        const alert = `\u26A0Your wallet ${vUser.wallet.address} has just been linked with another account.\u26A0 ` +
          `It is *NO LONGER LINKED* to this account. You MUST relink a wallet (different or same) with this account BEFORE ` +
          `depositing. Otherwise your funds will be credited to another account!!!`;
        await send(vUser.chatId, alert);
        vUser.wallet.linked = false;
        await vUser.save();
      }
      user.wallet.linked = true;
      await user.save();
      message = "Your wallet has been successfully linked	\u2705 to your account!\n\n" +
        "Any deposits you make from that wallet to the deposit address of this bot will now automatically " +
        "be credited to this account. When collecting treasures, the respective NFTs will also be sent " +
        "to the linked wallet.\n\n" +
        "_As a precaution, please still always check your wallet's status *BEFORE* depositing to ensure " +
        "your wallet is still linked to your account!_\n\nYou can now use the bot to *create* " +
        "and *collect* treasures! *Have fun.*\n\n";
    }
    //shouldn't happen
    else if (!user && verifiedUsers.length > 0) {
      user = findNewlyAdded(verifiedUsers);
    }
    //multiple users but non verified and non with matching password -> send back
    else {
      withdraw(from.toString(), value);
    }
  }
  else if (!user || users.length === 0) {
    //send money back
    //no entry found
    withdraw(from.toString(), value);
  }

  if (user) {
    if (user.wallet.linked) {
      user.wallet.balance = bigNumberArithmetic(user.wallet.balance, value, "+");
      await user.save();
      message += `${humanVal} have been credited to your account.`;
    }
    const inlineKeyboard = new InlineKeyboard();
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
          inlineKeyboard.url(link[0], link[1]);
        });
      });
    await send(user.chatId, message, inlineKeyboard);
  }
};

const findNewlyAdded = (users: IUser[]) => {
  return users.reduce((prev: IUser, curr: IUser) => {
    return prev.wallet.passwordExpiry < curr.wallet.passwordExpiry ? curr : prev;
  });
};

const checkPasswordMatch = (users: IUser[], transferAmount: string): IUser => {
  return users.find((eachUser: IUser) =>
    bigNumberComparison(eachUser.wallet.password, transferAmount, "=") &&
    !eachUser.wallet.passwordExpired());
};

export const withdraw = async (recipientAddress: string, value: string, recipient?: IUser): Promise<{
  block?: number;
  success: boolean;
  hash?: string;
}> => {
  //get estimation of transfer cost
  const info = await getTransactionCost("transfer", recipientAddress, value);
  //deduct fee from amount to be sent back
  const transferAmount = bigNumberArithmetic(value, info.partialFee.toString(), "-");

  const users: IUser[] = await User.find({});
  const allowed = await allowWithdrawal(botParams.api, value, users, recipient);
  if (!allowed) {
    console.log(`Sth fishy going on!\n\n` +
      `Account Balances don't add up in withdrawal!!!\n\n` +
      `User: ${recipient}\n\n` +
      `Withdrawal Amount: ${value}\n\n` +
      `Users: ${users}`);
    await send(botParams.settings.adminChatId, `Account Balances don't add up in withdrawal!!!\n\n` +
      `User: ${recipient ? recipient._id : recipient}\n\n` +
      `Withdrawal Amount: ${value}\n\n` +
      `User Balance: ${recipient ? recipient.getBalance() : recipient}`);
    return { success: false };
  }
  //send back if (amount - fee) is +ve
  if (bigNumberComparison(transferAmount, "0", ">")) {
    try {
      const tx = botParams.api.tx.balances.transfer(recipientAddress, transferAmount);
      const { block, hash, success } = await sendAndFinalize(tx, botParams.account);
      return { block, success, hash };
    }
    catch (error) {
      //write error to logs
      console.error(error);
      return { success: false };
    }
  }
  //throw into charity pool
  else {
    const charityAccount: IUser = await User.findOne({ char_id: botParams.settings.charityChatId });
    charityAccount.totalRewardBalance = bigNumberArithmetic(charityAccount.totalRewardBalance, value, "+");
    charityAccount.save();
    const message = `Attempt transfer to ${recipientAddress} an amount of: ${value}. The fee was higher ` +
      `than the transaction amount: ${info.partialFee.toString()}`;
    console.log(message);
    return { success: false };
  }
};

export const mintAndSend = async (remarks: string[],
  user: IUser): Promise<{
    block?: number;
    success: boolean;
    hash?: string;
    fee?: string;
    topupRequired?: boolean;
  }> => {
  const info = await getTransactionCost(
    "nft",
    null,
    null,
    remarks
  );
  const totalCost = bigNumberArithmetic(info.partialFee.toString(), botParams.settings.creatorReward, "+");
  const ableToCover: boolean = user.mintAllowed(totalCost);
  if (!ableToCover) {
    return { success: false, topupRequired: true, fee: totalCost };
  }
  const users: IUser[] = await User.find({});
  const allowed = await allowWithdrawal(botParams.api, totalCost, users, user);
  if (!allowed) {
    console.log(`Sth fishy going on!\n\n` +
      `Account Balances don't add up in NFT claim (mintAndSend)!!!\n\n` +
      `User: ${user}\n\n` +
      `Total Cost: ${totalCost}\n\n` +
      `Users: ${users}`);
    await send(botParams.settings.adminChatId, `Account Balances don't add up in NFT claim (mintAndSend)!!!\n\n` +
      `User: ${user ? user._id : user}\n\n` +
      `Total Cost: ${totalCost}\n\n` +
      `User Balance: ${user ? user.getBalance() : user}`);
    return { success: false };
  }

  const txs = [];
  for (const remark of remarks) {
    txs.push(botParams.api.tx.system.remark(remark));
  }
  try {
    const batch = botParams.api.tx.utility.batchAll(txs);
    const { block, hash, success } = await sendAndFinalize(batch, botParams.account);
    return { block, success, hash, fee: info.partialFee.toString() };
  }
  catch (error) {
    //write error to console
    console.error(error);
    return { success: false };
  }
};

export const mintNft = async (remark: string, user: IUser) => {
  const info = await getTransactionCostSingle(
    "nft",
    null,
    null,
    remark
  );
  const totalCost = bigNumberArithmetic(info.partialFee.toString(), botParams.settings.creatorReward, "+");
  const ableToCover: boolean = user.mintAllowed(totalCost);
  if (!ableToCover) {
    return { success: false, topupRequired: true, fee: totalCost };
  }
  const users: IUser[] = await User.find({});
  const allowed = await allowWithdrawal(botParams.api, totalCost, users, user);
  if (!allowed) {
    console.log(`Sth fishy going on!\n\n` +
      `Account Balances don't add up in NFT claim (mintNft)!!!\n\n` +
      `User: ${user}\n\n` +
      `Remark: ${remark}\n\n` +
      `Total Cost: ${totalCost}\n\n` +
      `Users: ${users}`);
    await send(botParams.settings.adminChatId, `Account Balances don't add up in NFT claim (mintNft)!!!\n\n` +
      `User: ${user ? user._id : user}\n\n` +
      `Remark: ${remark}\n\n` +
      `Total Cost: ${totalCost}\n\n` +
      `User Balance: ${user ? user.getBalance() : user}`);
    return { success: false };
  }

  try {
    const tx = botParams.api.tx.system.remark(remark);
    const { block, hash, success } = await sendAndFinalize(tx, botParams.account);
    return { block, success, hash, fee: info.partialFee.toString() };
  }
  catch (error) {
    //write error to console
    console.error(error);
    return { success: false };
  }
};

export const sendNft = async (remark: string, user: IUser) => {
  const info = await getTransactionCostSingle(
    "nft",
    null,
    null,
    remark
  );
  const totalCost = info.partialFee.toString();
  const ableToCover: boolean = user.mintAllowed(totalCost);
  if (!ableToCover) {
    return { success: false, topupRequired: true, fee: totalCost };
  }
  const users: IUser[] = await User.find({});
  const allowed = await allowWithdrawal(botParams.api, totalCost, users, user);
  if (!allowed) {
    console.log(`Sth fishy going on!\n\n` +
      `Account Balances don't add up in NFT claim (sendNft)!!!\n\n` +
      `User: ${user}\n\n` +
      `Remark: ${remark}\n\n` +
      `Total Cost: ${totalCost}\n\n` +
      `Users: ${users}`);
    await send(botParams.settings.adminChatId, `Account Balances don't add up in NFT claim (sendNft)!!!\n\n` +
      `User: ${user ? user._id : user}\n\n` +
      `Remark: ${remark}\n\n` +
      `Total Cost: ${totalCost}\n\n` +
      `User Balance: ${user ? user.getBalance() : user}`);
    return { success: false };
  }
  try {
    const tx = botParams.api.tx.system.remark(remark);
    const { block, hash, success } = await sendAndFinalize(tx, botParams.account);
    return { block, success, hash, fee: info.partialFee.toString() };
  }
  catch (error) {
    //write error to console
    console.error(error);
    return { success: false };
  }
};

//pass in if its transfer or remark type
export const getTransactionCost = async (
  type: string,
  recipient: string,
  toSendAmount?: string,
  toSendRemarks?: string[]): Promise<RuntimeDispatchInfo> => {
  try {
    if (type === "transfer") {
      //estimate fee for transfer back
      const value = toSendAmount;
      const info = await botParams.api.tx.balances
        .transfer(recipient, value)
        .paymentInfo(botParams.account.address);
      return info;
    }
    else if (type === "nft") {
      //get mint and transfer cost
      const remarks = toSendRemarks;
      const txs = [];
      for (const remark of remarks) {
        txs.push(botParams.api.tx.system.remark(remark));
      }
      const info = await botParams.api.tx.utility
        .batchAll(txs)
        .paymentInfo(botParams.account.address);
      return info;
    }
  }
  catch (error) {
    console.error(error);
  }
};

//pass in if its transfer or remark type
export const getTransactionCostSingle = async (
  type: string,
  recipient: string,
  toSendAmount?: string,
  toSendRemark?: string): Promise<RuntimeDispatchInfo> => {
  try {
    if (type === "transfer") {
      //estimate fee for transfer back
      const value = toSendAmount;
      const info = await botParams.api.tx.balances
        .transfer(recipient, value)
        .paymentInfo(botParams.account.address);
      return info;
    }
    else if (type === "nft") {
      //get mint/send cost      
      const info = await botParams.api.tx.system
        .remark(toSendRemark)
        .paymentInfo(botParams.account.address);
      return info;
    }
  }
  catch (error) {
    console.error(error);
  }
};
