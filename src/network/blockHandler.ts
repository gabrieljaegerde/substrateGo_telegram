import { botParams } from "../../config.js"
import { deposit } from "./accountHandler.js"
//import prom from "../../metrics.js"

// const lastBlockGauge = new prom.Gauge({
//   name: "substrate_bot_last_block",
//   help: "metric_help",
// })

export const fetchEventsAtBlock = async (blockNumber: number)=> {
  const blockHash = await botParams.api.rpc.chain.getBlockHash(blockNumber)
  const events = await botParams.api.query.system.events.at(blockHash)

  if (events.length > 0) {
    try {
      await newEventsHandler(events, currentBlock)
    } catch (error) {
      console.log(new Date(), error)
    }
  }
}

export const fetchMissingBlockEvents = async (latestBlockDb: number, to: number) => {
  try {
    for (let i = latestBlockDb + 1; i <= to; i++) {
      fetchEventsAtBlock(i)
    }
  } catch (error: any) {
    console.log(error);
  }
}

let currentBlock = 0
export const newHeaderHandler = async (header, provider) => {
  const blockNumber = header.number.toNumber()
  const latestBlock = await provider.get()
  if (latestBlock < blockNumber - 1) {
    await fetchMissingBlockEvents(latestBlock, blockNumber - 1)
  }
  if (currentBlock < blockNumber) currentBlock = blockNumber
  else return
  //lastBlockGauge.set(currentBlock)
  fetchEventsAtBlock(currentBlock)
  await provider.set(currentBlock)
}

const newEventsHandler = async (events, currentBlock) => {
  if (events.length > 0) {
    const depositEvents = events.filter(record => {
      //maybe better to get account public address instead of settings.deposit
      return record.event.section === "balances" && record.event.method === "Transfer" &&
        record.event.data[1].toString() === botParams.account.address
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

