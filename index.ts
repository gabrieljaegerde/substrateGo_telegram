import { botParams, getDb, getRemarkStorage } from "./config.js"
import { newHeaderHandler } from "./src/network/blockHandler.js"
import { alreadyReceived } from "./src/network/accountHandler.js"
import { getSettings } from "./tools/settings.js"
//import prom from "./metrics.js"
import pkg from 'rmrk-tools';
const { Consolidator, RemarkListener } = pkg;
import { blockCountAdapter } from "./tools/blockCountAdapter.js"
import { RemarkStorageAdapter } from "./tools/remarkStorageAdapter.js"
import pinataSDK from "@pinata/sdk"
import dotenv from "dotenv"
import User, { IUser } from "./src/models/user.js"
import { Header } from '@polkadot/types/interfaces';
import * as bot from "./bot.js"
import { createCharityUser } from "./tools/utils.js"
import { initAccount, getApi } from "./tools/substrateUtils.js"
import { ApiPromise } from "@polkadot/api"
import { KeyringPair } from "@polkadot/keyring/types"

dotenv.config()

class SubstrateBot {
  settings: any
  api: ApiPromise
  account: KeyringPair
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
    this.remarkStorage = getRemarkStorage()
  }

  async run() {
    const dbLoaded = await getDb()
    botParams.api = this.api
    botParams.remarkStorage = this.remarkStorage
    botParams.account = this.account

    const networkProperties = await this.api.rpc.system.properties()
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
    await createCharityUser()
    // prom.register.setDefaultLabels({
    //   telegram_bot_name: botParams.bot.options.username,
    //   network: botParams.settings.network.name,
    // })

    //setup block listener for transaction listener
    await this.api.rpc.chain.subscribeNewHeads(async (header: Header) =>
      newHeaderHandler(header, new blockCountAdapter(botParams.remarkStorage, "headerBlock"))
    )
    
    //setup remark listener for minting listener
    const consolidateFunction = async (remarks) => {
      console.log("remarks: ", remarks)
      const consolidator = new Consolidator(2, new RemarkStorageAdapter(botParams.remarkStorage))
      return consolidator.consolidate(remarks)
    }

    const startListening = async () => {
      const listener = new RemarkListener({
        polkadotApi: botParams.api,
        prefixes: ['0x726d726b', '0x524d524b'],
        consolidateFunction,
        storageProvider: new blockCountAdapter(botParams.remarkStorage, "remarkBlock")
      })
      const subscriber = listener.initialiseObservable()
      subscriber.subscribe((val) => console.log(val))
    }
    await startListening()

    //setup pinata
    botParams.pinata = pinataSDK(process.env.PINATA_API, process.env.PINATA_SECRET)

    try {
      const result = await botParams.pinata.testAuthentication()
      console.log(result)
    }
    catch (err) {
      //handle error here
      console.log(err)
    }
    //await mintNFT()
    this.invalidateCacheInterval = setInterval(() => {
      [...alreadyReceived.entries()].forEach(key => {
        const dateMinuteAgo = new Date()
        dateMinuteAgo.setSeconds(dateMinuteAgo.getSeconds() - 60)
        if (alreadyReceived.get(key[0]) < dateMinuteAgo) {
          alreadyReceived.delete(key[0])
        }
      })
    }, 60000)
  }

  async stop() {
    const users: Array<IUser> = await User.find({})
    for (const user of users) {
      const alert = `The bot will be down for an undetermined amount of time for maintenance. ` +
        `You will be notified when it comes back online. Sorry for the inconvenience!`
      await botParams.bot.api.sendMessage(user.chatId, alert)
    }
    clearInterval(this.invalidateCacheInterval)
  }
}

let substrateBot
async function main() {
  const settings = getSettings()
  const api = await getApi()
  const account = await initAccount()
  substrateBot = new SubstrateBot({
    settings,
    api,
    account
  })
  await substrateBot.run()
  /*
    for (var user of users) {
    var alert = `The bot is back online!`
    await botParams.bot.api.sendMessage(user.chatId, alert)
  }
  */
}

main()

