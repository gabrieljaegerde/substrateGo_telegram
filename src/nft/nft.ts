import { botParams } from "../../config.js"
import { NFT, Collection } from "rmrk-tools"
import { u8aToHex } from "@polkadot/util"
import { encodeAddress, decodeAddress } from "@polkadot/util-crypto"
import { pinSingleMetadataFromDir } from "../../tools/pinataUtils.js";
import { sendAndFinalize } from "../../tools/remarkUtils.js";

export const createChunkyCollection = async () => {
  try {
    const collectionId = Collection.generateId(
      u8aToHex(botParams.account.publicKey),
      botParams.settings.collectionSymbol
    );
    console.log("collection Id: ", collectionId)

    const collectionMetadataCid = await pinSingleMetadataFromDir(
      "/assets",
      "preview.png",
      "WestendTest",
      {
        description: "Do something.",
        external_url: "https://subylo.com",
        properties: {},
      }
    );

    const ItemsCollection = new Collection(
      0,
      0,
      encodeAddress(botParams.account.address, 2),
      botParams.settings.collectionSymbol,
      collectionId,
      collectionMetadataCid
    );

    const { block } = await sendAndFinalize(
      botParams.api.tx.system.remark(ItemsCollection.create()),
      botParams.account
    );
    console.log("COLLECTION CREATION REMARK: ", ItemsCollection.create());
    console.log("subby collection created at block: ", block);

    return block;
  } catch (error: any) {
    console.error(error);
  }
};

async function mintNFT() {
  try {
    const collectionId = Collection.generateId(
      u8aToHex(botParams.account.publicKey),
      botParams.settings.collectionSymbol
    );

    await createChunkyCollection()

    const metadataCid = await pinSingleMetadataFromDir(
      "/assets",
      "preview.png",
      `Test NFT`,
      {
        description: `This is the Test NFT!`,
        external_url: "https://subylo.com",
        properties: {
          rarity: {
            type: "string",
            value: "common",
          },
        },
      }
    );

    const nft = new NFT({
      block: 0,
      collection: collectionId,
      symbol: `tester_1`,
      transferable: 1,
      sn: `2`.padStart(8, "0"),
      owner: encodeAddress(botParams.account.address, 2),
      metadata: metadataCid,
    });

    const remark = nft.mint();
    const tx = botParams.api.tx.system.remark(remark);
    const { block } = await sendAndFinalize(tx, botParams.account);
    console.log("Test NFT minted at block: ", block);
    return block;
  } catch (error: any) {
    console.error(error);
  }
  // console.log("in")
  // const collectionMetadata = {
  //     description:
  //       "WestendG",
  //     attributes: [],
  //     external_url: "random_link",
  //     image: "non_yet",
  //   };
  // const collMdHash = "QmQsMDPAyb9EVkS81jYDDFnKh421xA6SrxpjasQJMBtSrV";
  // const remarks = [];
  // // Create collection
  // const collectionSymbol = "GONOW1";
  // const collectionId = Collection.generateId(
  //   u8aToHex(botParams.account.publicKey),
  //   "GONOW2"
  // );
  // let mintingAccount = botParams.account;
  // let decoded = decodeAddress(mintingAccount.address);
  // let address = mintingAccount.address//encodeAddress(decoded, 0);
  // /*
  // readonly block: number;
  // readonly max: number;
  // issuer: string;
  // readonly symbol: string;
  // readonly id: string;
  // readonly metadata: string;
  // changes: Change[] = [];*/
  // const eggCollection = new Collection(
  //     0,
  //     0,
  //     address,
  //     collectionSymbol,
  //     collectionId,
  //     `ipfs://ipfs/${collMdHash}`
  //   );
  // console.log("eggCollection: ", eggCollection)
  // remarks.push(eggCollection.create())
  // const txs = [];
  // let nftProps = {
  //   "block": 0,
  //   "collection": collectionId,
  //   "symbol": "string12",
  //   "transferable": 1,
  //   "sn": new Date().getTime().toString(),
  //   "metadata": `ipfs://ipfs/s`
  // }
  // const nft = new NFT(
  //   nftProps
  // );
  // console.log("nft: ", nft)
  // remarks.push(nft.mint());

  // for (const remark of remarks) {
  //   txs.push(botParams.api.tx.system.remark(remark));
  // }

  // await botParams.api.tx.utility
  //   .batchAll(txs)
  //   .signAndSend(botParams.account, ({ status }) => {
  //     if (status.isInBlock) {
  //       console.log(`included in ${status.asInBlock}`);
  //     }
  //   });
}

export {
  mintNFT,
}
