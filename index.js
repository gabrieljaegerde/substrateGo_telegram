//import { startBot } from "./bot.js"
import { botParams, getDb, getLocalStorage, getRemarkStorage } from "./config.js"
import { newHeaderHandler } from "./src/network/blockHandler.js"
import { alreadyReceived } from "./src/network/accountHandler.js"
import { mintNFT } from "./src/nft/nft.js"
import { getSettings } from "./src/settings.js"
import { getApi } from "./src/api.js"
import { initAccount } from "./src/account.js"
import prom from "./metrics.js"
import { fetchRemarks, getRemarksFromBlocks, getLatestFinalizedBlock, Consolidator, RemarkListener, NFT } from 'rmrk-tools';
//import pkg from 'rmrk-tools';
//const { fetchRemarks, getRemarksFromBlocks, getLatestFinalizedBlock, Consolidator, RemarkListener, NFT } = pkg;
import { LocalStorageProvider } from "./helpers/localStorageProvider.js"
import { RemarkStorageAdapter } from "./src/network/remarkStorageAdapter.js"
import pinataSDK from "@pinata/sdk"
import IPFS from "ipfs-core"
import _ from "lodash"

//import * as IPFS from 'ipfs';

import dotenv from "dotenv"

import * as bot from "./bot.js"
dotenv.config()

class SubstrateBot {
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
    modes,
    account
  }) {
    this.settings = settings
    this.api = api
    this.account = account
    this.db = getDb()
    this.localStorage = getLocalStorage()
    this.remarkStorage = getRemarkStorage()
  }

  async run() {
    botParams.api = this.api
    botParams.ui.keyboard = this.settings.keyboard
    botParams.db = this.db
    botParams.localStorage = this.localStorage
    botParams.remarkStorage = this.remarkStorage
    botParams.callback = this.settings.callback
    botParams.account = this.account

    var networkProperties = await this.api.rpc.system.properties()
    if (!this.settings.network.prefix && networkProperties.ss58Format) {
      this.settings.network.prefix = networkProperties.ss58Format.toString()
    }
    if (!this.settings.network.decimals && networkProperties.tokenDecimals) {
      this.settings.network.decimals = networkProperties.tokenDecimals.toString()
    }
    if (
      this.settings.network.token === undefined &&
      networkProperties.tokenSymbol
    ) {
      this.settings.network.token = networkProperties.tokenSymbol.toString()
    }
    botParams.settings = this.settings

    botParams.bot = await bot.run(this)
    prom.register.setDefaultLabels({
      telegram_bot_name: botParams.bot.options.username,
      network: botParams.settings.network.name,
    })

    await this.api.rpc.chain.subscribeNewHeads(async header =>
      newHeaderHandler(header)
    )

    const consolidateFunction = async (remarks) => {
      console.log("remarks: ", remarks)
      const consolidator = new Consolidator(null, new RemarkStorageAdapter())
      return consolidator.consolidate(remarks)
    }

    const startListening = async () => {
      const listener = new RemarkListener({
        polkadotApi: botParams.api,
        prefixes: ['0x726d726b', '0x524d524b'],
        consolidateFunction,
        storageProvider: new LocalStorageProvider()
      })
      const subscriber = listener.initialiseObservable()
      console.log("should be listening")
      subscriber.subscribe((val) => console.log("working:", val))
    }
    startListening()

    botParams.pinata = pinataSDK(process.env.PINATA_API, process.env.PINATA_SECRET)
    //botParams.ipfs = await IPFS.create()

    try {
      let result = await botParams.pinata.testAuthentication()
      console.log(result)
    }
    catch (err) {
      //handle error here
      console.log(err)
    }
    //console.log("here2")
    //await mintNFT()
    /*
        const to = await getLatestFinalizedBlock(this.api);
    
        const remarkBlocks = await fetchRemarks(this.api, 6431422, to, ['']);
        if (remarkBlocks && !isEmpty(remarkBlocks)) {
          const remarks = getRemarksFromBlocks(remarkBlocks);
          const consolidator = new Consolidator();
          const { nfts, collections } = consolidator.consolidate(remarks);
          console.log('Consolidated nfts:', nfts);
          console.log('Consolidated collections:', collections);
        }*/


    this.invalidateCacheInterval = setInterval(() => {
      ;[...alreadyReceived.entries()].forEach(key => {
        console.log("in invalidateCacheInterval")
        var dateMinuteAgo = new Date()
        dateMinuteAgo.setSeconds(dateMinuteAgo.getSeconds() - 60)
        if (alreadyReceived.get(key[0]) < dateMinuteAgo) {
          alreadyReceived.delete(key[0])
        }
      })
    }, 60000)
  }

  async stop() {
    botParams.db.read()
    botParams.db.chain = _.chain(botParams.db.data)
    let users = botParams.db.chain
      .get("users")
    for (var user of users) {
      var alert = `The bot will be down for an undetermined amount of time for maintenance. ` +
        `You will be notified when it comes back online. Sorry for the inconvenience!`
      await botParams.bot.telegram.sendMessage(user.chatid, alert)
    }
    clearInterval(this.invalidateCacheInterval)
  }
}

let substrateBot
async function main() {
  var settings = getSettings()
  var api = await getApi()
  var account = await initAccount()
  substrateBot = new SubstrateBot({
    settings,
    api,
    account
  })
  await substrateBot.run()
  botParams.db.read()
  botParams.db.chain = _.chain(botParams.db.data)
  let users = botParams.db.chain
    .get("users")
  /*
    for (var user of users) {
    var alert = `The bot is back online!`
    await botParams.bot.telegram.sendMessage(user.chatid, alert)
  }
  */
}

main()

