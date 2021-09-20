import { Collection, NFT, Base} from "rmrk-tools";
import { AcceptEntityType } from "rmrk-tools/dist/classes/accept";
import { IConsolidatorAdapter } from "rmrk-tools/dist/tools/consolidator/adapters/types";
import { BaseConsolidated, CollectionConsolidated, NFTConsolidated } from "rmrk-tools/dist/tools/consolidator/consolidator";
import { botParams } from "../../config.js"


export class RemarkStorageAdapter implements IConsolidatorAdapter {
  constructor() {
  }
  NFTconsolidated

  public async getAllNFTs() {
    botParams.remarkStorage.read()
    return botParams.remarkStorage.nfts;
  }

  public async getAllCollections() {
    botParams.remarkStorage.read()
    return botParams.remarkStorage.collections;
  }

  public async getAllBases() {
    botParams.remarkStorage.read()
    return botParams.remarkStorage.bases;
  }

  public async updateNFTEmote(nft: NFT, consolidatedNFT: NFTConsolidated) {
    botParams.remarkStorage.read()
    var nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      reactions: nft?.reactions,
    }
    botParams.remarkStorage.write()
  }

  public async updateBaseEquippable(
    base: Base,
    consolidatedBase: BaseConsolidated
  ) {
    botParams.remarkStorage.read()
    var baseDb = botParams.remarkStorage.data.bases.find(({ id }) => id === consolidatedBase.id)
    baseDb = {
      ...baseDb,
      parts: base?.parts,
    }
    botParams.remarkStorage.write()
  }

  public async updateNFTList(nft: NFT, consolidatedNFT: NFTConsolidated) {
    console.log("whassup")
    botParams.remarkStorage.read()
    var nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      forsale: nft?.forsale,
      changes: nft?.changes,
    }
    botParams.remarkStorage.write()
  }

  public async updateEquip(nft: NFT, consolidatedNFT: NFTConsolidated) {
    botParams.remarkStorage.read()
    var nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      children: nft.children,
    }
    botParams.remarkStorage.write()
  }

  public async updateSetPriority(nft: NFT, consolidatedNFT: NFTConsolidated) {
    botParams.remarkStorage.read()
    var nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      priority: nft.priority,
    }
    botParams.remarkStorage.write()
  }

  public async updateSetAttribute(nft: NFT, consolidatedNFT: NFTConsolidated) {
    botParams.remarkStorage.read()
    var nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      properties: nft.properties,
    }
    botParams.remarkStorage.write()
  }

  public async updateNftAccept(
    nft: NFT,
    consolidatedNFT: NFTConsolidated,
    entity: AcceptEntityType
  ) {
    botParams.remarkStorage.read()
    var nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    if (entity == "NFT") {
      nftDb = {
        ...nftDb,
        children: nft?.children,
        priority: nft?.priority || nftDb.priority,
      }
    } else if (entity === "RES") {
      nftDb = {
        ...nftDb,
        resources: nft?.resources,
        priority: nft?.priority || nftDb.priority,
      }
    }
    botParams.remarkStorage.write()
  }

  public async updateNftResadd(nft: NFT, consolidatedNFT: NFTConsolidated) {
    botParams.remarkStorage.read()
    var nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      resources: nft?.resources,
      priority: nft?.priority || nftDb.priority,
    }
  }

  public async updateNFTChildrenRootOwner(
    nft: NFT | NFTConsolidated,
    rootowner?: string,
    level?: number
  ) {
    if ((level || 1) < 10 && nft.children && nft.children.length > 0) {
      const promises = nft.children.map(async (child) => {
        var nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === child.id)
        if (
          nftDb?.children &&
          nftDb?.children.length > 0
        ) {
          await this.updateNFTChildrenRootOwner(
            nftDb,
            rootowner || nft.rootowner,
            (level || 1) + 1
          );
        }
        nftDb = {
          ...nftDb,
          forsale: BigInt(0),
          rootowner: rootowner || nft.rootowner,
        };
      });
      botParams.remarkStorage.write()
      await Promise.all(promises);
    }
  }

  public async updateNFTBuy(nft: NFT, consolidatedNFT: NFTConsolidated) {
    botParams.remarkStorage.read()
    var nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      owner: nft?.owner,
      changes: nft?.changes,
      forsale: nft?.forsale,
    }
    botParams.remarkStorage.write()
  }

  public async updateNFTSend(nft: NFT, consolidatedNFT: NFTConsolidated) {
    botParams.remarkStorage.read()
    var nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      changes: nft?.changes,
      owner: nft?.owner,
      rootowner: nft?.rootowner,
      forsale: BigInt(0),
    }
    botParams.remarkStorage.write()
  }

  public async updateNFTBurn(
    nft: NFT | NFTConsolidated,
    consolidatedNFT: NFTConsolidated
  ) {
    botParams.remarkStorage.read()
    var nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      burned: nft?.burned,
      changes: nft?.changes,
      forsale: BigInt(nft.forsale) > BigInt(0) ? BigInt(0) : nft.forsale,
    }
    botParams.remarkStorage.write()
  }

  public async updateNFTMint(nft: NFT) {
    botParams.remarkStorage.data.nfts.push({
      ...nft,
      symbol: nft.symbol,
      id: nft.getId(),
    })
    botParams.remarkStorage.write()
  }

  public async updateCollectionMint(collection: CollectionConsolidated) {
    botParams.remarkStorage.read()
    botParams.remarkStorage.data.collections.push(collection)
    botParams.remarkStorage.write()
    return
  }

  public async updateBase(base: Base) {
    botParams.remarkStorage.read()
    botParams.remarkStorage.data.bases.push({
      ...base,
      id: base.getId(),
    })
    botParams.remarkStorage.write()
  }

  public async updateBaseThemeAdd(
    base: Base,
    consolidatedBase: BaseConsolidated
  ) {
    botParams.remarkStorage.read()
    botParams.remarkStorage.data.bases.push({
      ...base,
      themes: base?.themes,
    })
    botParams.remarkStorage.write()
  }

  public async updateCollectionIssuer(
    collection,
    consolidatedCollection
  ) {
    botParams.remarkStorage.read()
    var collectionDb = botParams.remarkStorage.data.collections.find(({ id }) => id === consolidatedCollection.id)
    collectionDb = {
      ...collectionDb,
      issuer: collection?.issuer,
      changes: collection?.changes,
    }
    botParams.remarkStorage.write()
  }

  public async updateBaseIssuer(
    base,
    consolidatedBase
  ) {
    botParams.remarkStorage.read()
    var baseDb = botParams.remarkStorage.data.bases.find(({ id }) => id === consolidatedBase.id)
    baseDb = {
      ...baseDb,
      issuer: base?.issuer,
      changes: base?.changes,
    };
  }

  public async getNFTById(id: string) {
    botParams.remarkStorage.read()
    return botParams.remarkStorage.data.nfts.find((nft) => nft.id === id)
  }

  public async getCollectionById(id: string) {
    botParams.remarkStorage.read()
    console.log("id", id)
    console.log("here", botParams.remarkStorage.data.collections.find((collection) => collection.id === id))
    return botParams.remarkStorage.data.collections.find((collection) => collection.id === id)
  }

  /**
   * Find existing NFT by id
   */
  public async getNFTByIdUnique(id: string) {
    botParams.remarkStorage.read()
    return botParams.remarkStorage.data.nfts.find((nft) => nft.id === id)
  }

  public async getBaseById(id: string) {
    botParams.remarkStorage.read()
    return botParams.remarkStorage.data.bases.find((base) => base.id === id)
  }
}
