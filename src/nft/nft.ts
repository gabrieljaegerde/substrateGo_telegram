import { botParams } from "../../config.js"
import { NFT, Collection } from "rmrk-tools"
import { u8aToHex } from "@polkadot/util"
import { encodeAddress } from "@polkadot/util-crypto"
import { pinSingleMetadataFromDir } from "../../tools/pinataUtils.js";
import { sendAndFinalize } from "../../tools/substrateUtils.js";

export const createCollection = async () => {
  try {
    const collectionId = Collection.generateId(
      u8aToHex(botParams.account.publicKey),
      botParams.settings.collectionSymbol
    );
    console.log("collection Id: ", collectionId)

    const collectionMetadataCid = await pinSingleMetadataFromDir(
      "/assets",
      "preview.png",
      "DevTest",
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

    await createCollection()

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
}

export {
  mintNFT,
}
