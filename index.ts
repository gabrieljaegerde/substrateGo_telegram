import { botParams, getDb, getLocalStorage, getRemarkStorage } from "./config.js"
import { newHeaderHandler } from "./src/network/blockHandler.js"
import { alreadyReceived } from "./src/network/accountHandler.js"
import { mintNFT } from "./src/nft/nft.js"
import { getSettings } from "./src/settings.js"
import { getApi } from "./src/api.js"
import { initAccount } from "./src/account.js"
//import prom from "./metrics.js"
//import { fetchRemarks, getRemarksFromBlocks, getLatestFinalizedBlock, Consolidator, RemarkListener, NFT } from 'rmrk-tools';
import pkg from 'rmrk-tools';
const { Consolidator, RemarkListener } = pkg;
import { LocalStorageProvider } from "./helpers/localStorageProvider.js"
import { RemarkStorageAdapter } from "./src/network/remarkStorageAdapter.js"
import pinataSDK from "@pinata/sdk"
import _ from "lodash"
import dotenv from "dotenv"
import User, { IUser } from "./src/models/user.js"


import * as bot from "./bot.js"
dotenv.config()

class SubstrateBot {
  settings: any
  api: any
  account: any
  dbClient: any
  localStorage: any
  remarkStorage: any
  invalidateCacheInterval: NodeJS.Timer
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
    this.settings = settings
    this.api = api
    this.account = account
    this.localStorage = getLocalStorage()
    this.remarkStorage = getRemarkStorage()
  }

  async run() {
    await getDb()
    botParams.api = this.api
    botParams.localStorage = this.localStorage
    botParams.remarkStorage = this.remarkStorage
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
    // prom.register.setDefaultLabels({
    //   telegram_bot_name: botParams.bot.options.username,
    //   network: botParams.settings.network.name,
    // })

    //setup block listener for transaction listener
    await this.api.rpc.chain.subscribeNewHeads(async header =>
      newHeaderHandler(header)
    )

    //setup remark listener for minting listener
    const consolidateFunction = async (remarks) => {
      console.log("remarks: ", remarks)
      const consolidator = new Consolidator(2, new RemarkStorageAdapter() )
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
      subscriber.subscribe((val) => console.log(val))
    }
    await startListening()

    //setup pinata
    botParams.pinata = pinataSDK(process.env.PINATA_API, process.env.PINATA_SECRET)

    try {
      let result = await botParams.pinata.testAuthentication()
      console.log(result)
    }
    catch (err) {
      //handle error here
      console.log(err)
    }
    //await mintNFT()
    this.invalidateCacheInterval = setInterval(() => {
      ;[...alreadyReceived.entries()].forEach(key => {
        var dateMinuteAgo = new Date()
        dateMinuteAgo.setSeconds(dateMinuteAgo.getSeconds() - 60)
        if (alreadyReceived.get(key[0]) < dateMinuteAgo) {
          alreadyReceived.delete(key[0])
        }
      })
    }, 60000)
  }

  async stop() {
    let users: Array<IUser> = await User.find({})
    for (var user of users) {
      var alert = `The bot will be down for an undetermined amount of time for maintenance. ` +
        `You will be notified when it comes back online. Sorry for the inconvenience!`
      await botParams.bot.telegram.sendMessage(user.chat_id, alert)
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
  /*
    for (var user of users) {
    var alert = `The bot is back online!`
    await botParams.bot.telegram.sendMessage(user.chat_id, alert)
  }
  */
}

main()

