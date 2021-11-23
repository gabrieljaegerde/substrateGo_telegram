import { botParams, getDb, getRemarkStorage } from "./config.js";
import { getSettings } from "./tools/settings.js";
//import prom from "./metrics.js"
import { Consolidator, RemarkListener } from "rmrk-tools";
import { blockCountAdapter } from "./tools/blockCountAdapter.js";
import { RemarkStorageAdapter } from "./tools/remarkStorageAdapter.js";
import pinataSDK from "@pinata/sdk";
import dotenv from "dotenv";
import User, { IUser } from "./src/models/user.js";
import * as bot from "./bot.js";
import { bigNumberArithmetic, createCharityUser, send } from "./tools/utils.js";
import { initAccount, getApi } from "./tools/substrateUtils.js";
import { ApiPromise } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import { Low } from "lowdb/lib";
import { createGoCollection } from "./tools/startScripts/createGoCollection.js";
import mongoose from "mongoose";
import { TransactionListener } from "./src/network/transactionListener.js";
import { uploadDefaultNftFile } from "./tools/startScripts/uploadDefaultNftFile.js";

dotenv.config();

class SubstrateBot {
  settings: any;
  api: ApiPromise;
  account: KeyringPair;
  remarkStorage: Low;
  /**
   * Create SubstrateBot instance
   * @param config - SubstrateBot config
   * @param config.settings - main bot settings, should contain substrate network params (name, prefix, decimals, token),
   * telegram bot token, start & validators messages, links (governance, common), list of group alerts. See sample in examples
   * @param config.api - polkadot-api instance for connect to node
   * @param config.getNetworkStats - external function for getting substrate network stats
   */
  constructor({
    settings,
    api,
    account
  }) {
    this.settings = settings;
    this.api = api;
    this.account = account;
    this.remarkStorage = getRemarkStorage();
  }

  async run() {
    await getDb();
    botParams.api = this.api;
    botParams.remarkStorage = this.remarkStorage;
    botParams.account = this.account;

    const networkProperties = await this.api.rpc.system.properties();
    if (!this.settings.network.prefix && networkProperties.ss58Format) {
      this.settings.network.prefix = networkProperties.ss58Format.toString();
    }
    if (!this.settings.network.decimals && networkProperties.tokenDecimals) {
      this.settings.network.decimals = networkProperties.tokenDecimals.toString();
    }
    if (
      this.settings.network.token === undefined &&
      networkProperties.tokenSymbol
    ) {
      this.settings.network.token = networkProperties.tokenSymbol.toString();
    }
    botParams.settings = this.settings;
    await createCharityUser();


    if (process.env.SETUP_COMPLETE === "true") {
      const { runnerHandle, tBot } = await bot.start();
      botParams.bot = tBot;
      botParams.runnerHandle = runnerHandle;
      new TransactionListener(botParams.api,
        new blockCountAdapter(botParams.remarkStorage, "headerBlock"));
    }
    //setup remark listener for minting listener
    const consolidateFunction = async (remarks) => {
      const consolidator = new Consolidator(2, new RemarkStorageAdapter(botParams.remarkStorage));
      return consolidator.consolidate(remarks);
    };

    const startListening = async () => {
      const listener = new RemarkListener({
        polkadotApi: botParams.api,
        prefixes: ['0x726d726b', '0x524d524b'],
        consolidateFunction,
        storageProvider: new blockCountAdapter(botParams.remarkStorage, "remarkBlock")
      });
      const subscriber = listener.initialiseObservable();
      subscriber.subscribe(async (val) => {
        // if (val.invalid && val.invalid.length > 0) {
        //   await botParams.bot.api
        //     .sendMessage(botParams.settings.adminChatId, `Invalid Remark: ${JSON.stringify(val.invalid)}`);
        // }
      });
    };
    await startListening();

    //setup pinata
    botParams.pinata = pinataSDK(process.env.PINATA_API, process.env.PINATA_SECRET);

    try {
      const result = await botParams.pinata.testAuthentication();
      console.log(result);
    }
    catch (err) {
      //handle error here
      console.log(err);
    }
    if (process.env.SETUP_COMPLETE !== "true") {
      await createGoCollection();
      await uploadDefaultNftFile();
    }
    const users: IUser[] = await User.find({});
    let allUsersBalance = "0";
    for (const user of users) {
      allUsersBalance = bigNumberArithmetic(allUsersBalance, user.getBalance(), "+");
    }
    console.log("totalUserBalance: ", allUsersBalance);
    const { data: botWalletBalance } = await botParams.api.query.system.account(botParams.account.address);
    console.log("botBalance: ", botWalletBalance.free.toString());
    const botStartBalance = bigNumberArithmetic(botWalletBalance.free.toString(), allUsersBalance, "-");
    console.log("botStartBalance: ", botStartBalance);
  }

  async stop() {
    const users: IUser[] = await User.find({});
    const alert = `🚧🚧🚧🚧🚧🚧🚧🚧🚧\nThe bot will be down for an undetermined amount of time for *maintenance*.\n\n` +
      `👷🏽‍♀️👷🏻We are working hard to get the bot running again soon and ` +
      `you will be notified when it comes back online.\n\n*Sorry for the inconvenience!*\n\n_Please ` +
      `refrain from depositing to the bot wallet until the bot is running again._\n🚧🚧🚧🚧🚧🚧🚧🚧🚧`;
    if (process.env.SETUP_COMPLETE === "true") {
      for (const user of users) {
        if (user.chatId !== botParams.settings.charityChatId && !user.blocked) {
          await send(user.chatId, alert);
        }
      }
      await botParams.runnerHandle.stop();
      console.log("bot stopped.");
    }
    await mongoose.connection.close(false);
    console.log('MongoDb connection closed.');
    process.exit(0);
  }
}

let substrateBot;
async function main() {
  const settings = getSettings();
  const api = await getApi();
  const account = await initAccount();
  substrateBot = new SubstrateBot({
    settings,
    api,
    account
  });
  await substrateBot.run();
  const users: IUser[] = await User.find({});
  const alert = `🚨The bot is back *online*!🚨`;
  if (process.env.SETUP_COMPLETE === "true") {
    for (const user of users) {
      if (user.chatId !== botParams.settings.charityChatId && !user.blocked) {
        await send(user.chatId, alert);
      }
    }
  }
  process.once('SIGINT', () => {
    substrateBot.stop();
  });
  process.once('SIGTERM', () => {
    substrateBot.stop();
  });
}

main();

