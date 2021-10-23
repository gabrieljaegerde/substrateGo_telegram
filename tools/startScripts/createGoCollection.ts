import { botParams } from "../../config.js";
import { NFT, Collection } from "rmrk-tools";
import { u8aToHex } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import { pinSingleMetadataFromDir } from "../../tools/pinataUtils.js";
import { sendAndFinalize } from "../../tools/substrateUtils.js";

export const createGoCollection = async () => {
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