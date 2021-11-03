import { botParams, getDb, getRemarkStorage } from "./config.js";
import { newHeaderHandler } from "./src/network/blockHandler.js";
import { alreadyReceived } from "./src/network/accountHandler.js";
import { getSettings } from "./tools/settings.js";
//import prom from "./metrics.js"
import { Consolidator, RemarkListener } from "rmrk-tools";
import { blockCountAdapter } from "./tools/blockCountAdapter.js";
import { RemarkStorageAdapter } from "./tools/remarkStorageAdapter.js";
import pinataSDK from "@pinata/sdk";
import dotenv from "dotenv";
import User, { IUser } from "./src/models/user.js";
import { Header } from "@polkadot/types/interfaces";
import * as bot from "./bot.js";
import { createCharityUser, send } from "./tools/utils.js";
import { initAccount, getApi } from "./tools/substrateUtils.js";
import { ApiPromise } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import { Low } from "lowdb/lib";
import { createGoCollection } from "./tools/startScripts/createGoCollection.js";
import mongoose from "mongoose";

dotenv.config();

class SubstrateBot {
  settings: any;
  api: ApiPromise;
  account: KeyringPair;
  remarkStorage: Low;
  invalidateCacheInterval: NodeJS.Timer;
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

    //setup block listener for transaction listener
    await this.api.rpc.chain.subscribeNewHeads(async (header: Header) =>
      newHeaderHandler(header, new blockCountAdapter(botParams.remarkStorage, "headerBlock"))
    );

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
    this.invalidateCacheInterval = setInterval(() => {
      [...alreadyReceived.entries()].forEach(key => {
        const dateMinuteAgo = new Date();
        dateMinuteAgo.setSeconds(dateMinuteAgo.getSeconds() - 60);
        if (alreadyReceived.get(key[0]) < dateMinuteAgo) {
          alreadyReceived.delete(key[0]);
        }
      });
    }, 60000);
    if (process.env.SETUP_COMPLETE === "true") {
      const { runnerHandle, tBot } = await bot.start();
      botParams.bot = tBot;
      botParams.runnerHandle = runnerHandle;
    }
    else {
      await createGoCollection();
    }
  }

  async stop() {
    clearInterval(this.invalidateCacheInterval);
    const users: IUser[] = await User.find({});
    const alert = `🚧🚧🚧🚧🚧🚧🚧🚧🚧\nThe bot will be down for an undetermined amount of time for *maintenance*.\n\n` +
      `👷🏽‍♀️👷🏻We are working hard to get the bot running again soon and ` +
      `you will be notified when it comes back online.\n\n*Sorry for the inconvenience!*\n\n_Please ` +
      `refrain from depositing to the bot wallet until the bot is running again._\n🚧🚧🚧🚧🚧🚧🚧🚧🚧`;
    for (const user of users) {
      if (user.chatId !== botParams.settings.charityChatId && !user.blocked) {
        await send(user.chatId, alert);
      }
    }
    await botParams.runnerHandle.stop();
    console.log("bot stopped.");
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
  for (const user of users) {
    if (user.chatId !== botParams.settings.charityChatId && !user.blocked) {
      await send(user.chatId, alert);
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

