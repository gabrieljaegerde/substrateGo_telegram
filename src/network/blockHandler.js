import { botParams } from "../../config.js"
import _ from "lodash"
import { deposit } from "./accountHandler.js"
//import prom from "../../metrics.js"

// const lastBlockGauge = new prom.Gauge({
//   name: "substrate_bot_last_block",
//   help: "metric_help",
// })

let currentBlock = 0
async function newHeaderHandler(header) {
  const blockNumber = header.number.toNumber()
  if (currentBlock < blockNumber) currentBlock = blockNumber
  else return
  //lastBlockGauge.set(currentBlock)
  const blockHash = await botParams.api.rpc.chain.getBlockHash(blockNumber)
  const block = await botParams.api.rpc.chain.getBlock(blockHash)
  const events = await botParams.api.query.system.events.at(blockHash)
  
  if (events.length > 0) {
    try {
      await newEventsHandler(events, currentBlock)
    } catch (error) {
      console.log(new Date(), error)
    }
  }
}

async function newEventsHandler(events, currentBlock) {
  if (events.length > 0) {
    let depositEvents = events.filter(record => {
      //maybe better to get account public address instead of settings.deposit
      return record.event.section === "balances" && record.event.method === "Transfer" &&
        record.event.data[1].toString() === botParams.settings.depositAddress.toString()
    })
    depositEvents.forEach(event => {
      try {
        deposit(event, currentBlock)
      } catch (error) {
        console.log(new Date(), error)
      }
    })
  }
}

export {
  newHeaderHandler,
}
