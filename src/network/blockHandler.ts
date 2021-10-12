import { botParams } from "../../config.js"
import { deposit } from "./accountHandler.js"
import { encodeAddress } from "@polkadot/util-crypto"

export const fetchEventsAtBlock = async (blockNumber: number) => {
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
      if (record.event.section === "balances" && record.event.method === "Transfer" && record.event.data[1]) {
        console.log("record.event.data[1].toString()", record.event.data[1].toString())
        console.log("botParams.account.address", botParams.account.address)
        console.log("botParams.account.address2", botParams.account.publicKey)
        console.log("encodeAddress(botParams.account.address, 2)", encodeAddress(botParams.account.address, 2))
        console.log("encodeAddress(botParams.account.address, 0)", encodeAddress(botParams.account.address, 0))
      }

      return record.event.section === "balances" && record.event.method === "Transfer" &&
        record.event.data[1].toString() === encodeAddress(botParams.account.address, botParams.settings.network.prefix)
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

