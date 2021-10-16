import { botParams } from "../../config.js";
import { NFT, Collection } from "rmrk-tools";
import { u8aToHex } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import { pinSingleMetadataFromDir } from "../../tools/pinataUtils.js";
import { sendAndFinalize } from "../../tools/substrateUtils.js";

export const createCollection = async () => {
  try {
    const collectionId = Collection.generateId(
      u8aToHex(botParams.account.publicKey),
      botParams.settings.collectionSymbol
    );
    console.log("collection Id: ", collectionId);

    const collectionMetadataCid = await pinSingleMetadataFromDir(
      "/assets",
      "kusamaGo.png",
      "KusamaGo - Gen1",
      {
        description: "KusamaGo - Generation One",
        external_url: botParams.settings.externalUrl,
        properties: {},
      }
    );

    const ItemsCollection = new Collection(
      0,
      0,
      encodeAddress(botParams.account.address, botParams.settings.network.prefix),
      botParams.settings.collectionSymbol,
      collectionId,
      collectionMetadataCid
    );

    const { block } = await sendAndFinalize(
      botParams.api.tx.system.remark(ItemsCollection.create()),
      botParams.account
    );
    console.log("COLLECTION CREATION REMARK: ", ItemsCollection.create());
    console.log("Collection created at block: ", block);

    return block;
  } catch (error: any) {
    console.error(error);
  }
};

//this function will be run once to set up the collection and test nft creation.
export const mintNFT = async() => {
  try {
    const collectionId = Collection.generateId(
      u8aToHex(botParams.account.publicKey),
      botParams.settings.collectionSymbol
    );

    await createCollection();

    const metadataCid = await pinSingleMetadataFromDir(
      "/assets",
      "defaultNFT.png",
      `Test NFT`,
      {
        description: `This is a Test NFT!`,
        external_url: botParams.settings.externalUrl,
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
      sn: `1`.padStart(8, "0"),
      owner: encodeAddress(botParams.account.address, botParams.settings.network.prefix),
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
