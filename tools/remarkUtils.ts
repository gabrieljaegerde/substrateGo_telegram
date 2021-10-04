import { KeyringPair } from "@polkadot/keyring/types";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { ISubmittableResult } from "@polkadot/types/types";
import { CodecHash } from "@polkadot/types/interfaces";
import { botParams } from "../config.js"

export const sendAndFinalize = async (
    tx: SubmittableExtrinsic<"promise", ISubmittableResult>,
    account: KeyringPair
  ): Promise<{
    block: number;
    success: boolean;
    hash: CodecHash;
    included: any[];
    finalized: any[];
  }> => {
    return new Promise(async (resolve) => {
      let success = false;
      let included = [];
      let finalized = [];
      let block = 0;
      let unsubscribe = await tx.signAndSend(
        account,
        async ({ events = [], status, dispatchError }) => {
          if (status.isInBlock) {
            success = dispatchError ? false : true;
            console.log(
              `📀 Transaction ${tx.meta.name} included at blockHash ${status.asInBlock} [success = ${success}]`
            );
            const signedBlock = await botParams.api.rpc.chain.getBlock(status.asInBlock);
            block = signedBlock.block.header.number.toNumber();
            included = [...events];
          } else if (status.isBroadcast) {
            console.log(`🚀 Transaction broadcasted.`);
          } else if (status.isFinalized) {
            console.log(
              `💯 Transaction ${tx.meta.name}(..) Finalized at blockHash ${status.asFinalized}`
            );
            finalized = [...events];
            let hash = status.hash;
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