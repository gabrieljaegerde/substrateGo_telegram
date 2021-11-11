import { KeyringPair } from "@polkadot/keyring/types";
import { Keyring } from "@polkadot/api";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { ISubmittableResult } from "@polkadot/types/types";
import { botParams } from "../config.js";
import { bigNumberArithmetic, bigNumberComparison } from "./utils.js";
import { IUser } from "../src/models/user.js";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";

export const getApi = async (): Promise<ApiPromise> => {
  await cryptoWaitReady();
  const wsNodeUri = process.env.WS_NODE_URI || "ws://127.0.0.1:9944/";
  const wsProvider = new WsProvider(wsNodeUri);
  const api = await ApiPromise.create({ provider: wsProvider });
  return api;
};

export const initAccount = (): KeyringPair => {
  const keyring = new Keyring({ type: "sr25519" });
  const account = keyring.addFromUri(process.env.MNEMONIC);
  return account;
};

export const sendAndFinalize = async (
  tx: SubmittableExtrinsic<"promise", ISubmittableResult>,
  account: KeyringPair
): Promise<{
  block: number;
  success: boolean;
  hash: string;
  included: any[];
  finalized: any[];
}> => {
  return new Promise(async (resolve) => {
    let success = false;
    let included = [];
    let finalized = [];
    let block = 0;
    const unsubscribe = await tx.signAndSend(
      account,
      async ({ events = [], status, dispatchError }) => {
        if (status.isInBlock) {
          console.log(`status: ${status}`);

          success = dispatchError ? false : true;
          console.log(
            `📀 Transaction ${tx.meta.name} included at blockHash ${status.asInBlock} [success = ${success}]`
          );
          const signedBlock = await botParams.api.rpc.chain.getBlock(status.asInBlock);
          block = signedBlock.block.header.number.toNumber();
          included = [...events];
        } else if (status.isBroadcast) {
          console.log(`${new Date()}🚀 Transaction broadcasted.`);
        } else if (status.isFinalized) {
          console.log(
            `💯 Transaction ${tx.meta.name}(..) Finalized at blockHash ${status.asFinalized}`
          );
          finalized = [...events];
          const hash = tx.hash.toHex();
          unsubscribe();
          resolve({ success, hash, included, finalized, block });
        } else if (status.isReady) {
          // let's not be too noisy..
        } else {
          console.log(`🤷 Other status ${status}`);
        }
      }
    );
  });
};

export const checkBalances = async (api: ApiPromise,
  users: IUser[]): Promise<boolean> => {
  let allUsersBalance = "0";
  for (const user of users) {
    allUsersBalance = bigNumberArithmetic(allUsersBalance, user.getBalance(), "+");
  }
  //in case there was a start balance on the wallet
  allUsersBalance = bigNumberArithmetic(allUsersBalance, botParams.settings.walletStartFunds, "+");
  const { data: botWalletBalance } = await api.query.system.account(botParams.account.address);
  console.log("botWalletBalance", botWalletBalance.free.toString());
  console.log("allUsersBalance", allUsersBalance);
  const everythingAddsUp = bigNumberComparison(botWalletBalance.free.toString(), allUsersBalance, ">=");
  console.log("everythingAddsUp: ", everythingAddsUp);
  return everythingAddsUp;
};

export const getLatestFinalizedBlock = async (
  api: ApiPromise
): Promise<number> => {
  const hash = await api.rpc.chain.getFinalizedHead();
  const header = await api.rpc.chain.getHeader(hash);
  if (header.number.toNumber() === 0) {
    console.error("Unable to retrieve finalized head - returned genesis block");
    process.exit(1);
  }
  return header.number.toNumber();
};