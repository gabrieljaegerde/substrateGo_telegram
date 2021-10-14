import { botParams } from "../../config.js";
import { deposit } from "./accountHandler.js";
import { encodeAddress } from "@polkadot/util-crypto";

export const fetchEventsAtBlock = async (blockNumber: number): Promise<void> => {
  const blockHash = await botParams.api.rpc.chain.getBlockHash(blockNumber);
  const events = await botParams.api.query.system.events.at(blockHash);
  if (events.length > 0) {
    try {
      await newEventsHandler(events, currentBlock);
    } catch (error) {
      console.log(new Date(), error);
    }
  }
};

export const fetchMissingBlockEvents = async (latestBlockDb: number, to: number): Promise<void> => {
  try {
    for (let i = latestBlockDb + 1; i <= to; i++) {
      fetchEventsAtBlock(i);
    }
  } catch (error) {
    console.log(error);
  }
};

let currentBlock = 0;
export const newHeaderHandler = async (header, provider): Promise<void> => {
  const blockNumber = header.number.toNumber();
  const latestBlock = await provider.get();
  if (latestBlock < blockNumber - 1) {
    await fetchMissingBlockEvents(latestBlock, blockNumber - 1);
  }
  if (currentBlock < blockNumber) currentBlock = blockNumber;
  else return;
  fetchEventsAtBlock(currentBlock);
  await provider.set(currentBlock);
};

const newEventsHandler = async (events, currentBlock) => {
  if (events.length > 0) {

    const depositEvents = events.filter(record => {
      return record.event.section === "balances" && record.event.method === "Transfer" &&
        record.event.data[1].toString() === encodeAddress(botParams.account.address, botParams.settings.network.prefix);
    });
    depositEvents.forEach(event => {
      try {
        deposit(event, currentBlock);
      } catch (error) {
        console.log(new Date(), error);
      }
    });
  }
};

