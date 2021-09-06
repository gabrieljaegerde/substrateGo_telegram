import { botParams } from "../../config.js"
import { NFT, Collection } from "rmrk-tools"
//import pkg from 'rmrk-tools';
//const { NFT, Collection } = pkg;
import { u8aToHex } from "@polkadot/util"
import { encodeAddress, decodeAddress } from "@polkadot/util-crypto"
//check before rendering each nft if enough balance

async function mintNFT(){
  console.log("in")
  const collectionMetadata = {
      description:
        "WestendG",
      attributes: [],
      external_url: "random_link",
      image: "non_yet",
    }; // QmQsMDPAyb9EVkS81jYDDFnKh4E2xA6SkxpjVaQJMBtSrV
  const collMdHash = "QmQsMDPAyb9EVkS81jYDDFnKh421xA6SrxpjasQJMBtSrV";
  const remarks = [];
  // Create collection
  const collectionSymbol = "GONOW1";
  const collectionId = Collection.generateId(
    u8aToHex(botParams.account.publicKey),
    "GONOW2"
  );
  let mintingAccount = botParams.account;
  let decoded = decodeAddress(mintingAccount.address);
  let address = mintingAccount.address//encodeAddress(decoded, 0);
  /*
  readonly block: number;
  readonly max: number;
  issuer: string;
  readonly symbol: string;
  readonly id: string;
  readonly metadata: string;
  changes: Change[] = [];*/
  const eggCollection = new Collection(
      0,
      0,
      address,
      collectionSymbol,
      collectionId,
      `ipfs://ipfs/${collMdHash}`
    );
  console.log("eggCollection: ", eggCollection)
  remarks.push(eggCollection.create())
  const txs = [];
  let nftProps = {
    "block": 0,
    "collection": collectionId,
    "symbol": "string12",
    "transferable": 1,
    "sn": new Date().getTime().toString(),
    "metadata": `ipfs://ipfs/s`
  }
  const nft = new NFT(
    nftProps
  );
  console.log("nft: ", nft)
  remarks.push(nft.mint());

  for (const remark of remarks) {
    txs.push(botParams.api.tx.system.remark(remark));
  }

  await botParams.api.tx.utility
    .batchAll(txs)
    .signAndSend(botParams.account, ({ status }) => {
      if (status.isInBlock) {
        console.log(`included in ${status.asInBlock}`);
      }
    });
}

export {
  mintNFT,
}
