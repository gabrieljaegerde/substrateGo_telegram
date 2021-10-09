import { Collection, NFT, Base } from "rmrk-tools";
import { AcceptEntityType } from "rmrk-tools/dist/classes/accept";
import { IConsolidatorAdapter } from "rmrk-tools/dist/tools/consolidator/adapters/types";
import { BaseConsolidated, CollectionConsolidated, NFTConsolidated } from "rmrk-tools/dist/tools/consolidator/consolidator";
import { botParams } from "../config.js"

//@ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

export class RemarkStorageAdapter implements IConsolidatorAdapter {
  private db: any
  constructor(db: any) {
    this.db = db
  }
  NFTconsolidated

  public async getAllNFTs() {
    await this.db.read()
    return this.db.nfts;
  }

  public async getAllCollections() {
    await this.db.read()
    return this.db.collections;
  }

  public async getAllBases() {
    await this.db.read()
    return this.db.bases;
  }

  public async updateNFTEmote(nft: NFT, consolidatedNFT: NFTConsolidated) {
    await this.db.read()
    let nftDb = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      reactions: nft?.reactions,
    }
    await this.db.write()
  }

  public async updateBaseEquippable(
    base: Base,
    consolidatedBase: BaseConsolidated
  ) {
    await this.db.read()
    let baseDb = this.db.data.bases.find(({ id }) => id === consolidatedBase.id)
    baseDb = {
      ...baseDb,
      parts: base?.parts,
    }
    await this.db.write()
  }

  public async updateNFTList(nft: NFT, consolidatedNFT: NFTConsolidated) {
    await this.db.read()
    let nftDb = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      forsale: nft?.forsale,
      changes: nft?.changes,
    }
    await this.db.write()
  }

  public async updateEquip(nft: NFT, consolidatedNFT: NFTConsolidated) {
    await this.db.read()
    let nftDb = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      children: nft.children,
    }
    await this.db.write()
  }

  public async updateSetPriority(nft: NFT, consolidatedNFT: NFTConsolidated) {
    await this.db.read()
    let nftDb = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      priority: nft.priority,
    }
    await this.db.write()
  }

  public async updateSetAttribute(nft: NFT, consolidatedNFT: NFTConsolidated) {
    await this.db.read()
    let nftDb = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      properties: nft.properties,
    }
    await this.db.write()
  }

  public async updateNftAccept(
    nft: NFT,
    consolidatedNFT: NFTConsolidated,
    entity: AcceptEntityType
  ) {
    await this.db.read()
    let nftDb = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id)
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
    await this.db.write()
  }

  public async updateNftResadd(nft: NFT, consolidatedNFT: NFTConsolidated) {
    await this.db.read()
    let nftDb = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id)
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
        let nftDb = this.db.data.nfts.find(({ id }) => id === child.id)
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
      await this.db.write()
      await Promise.all(promises);
    }
  }

  public async updateNFTBuy(nft: NFT, consolidatedNFT: NFTConsolidated) {
    await this.db.read()
    let nftDb = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      owner: nft?.owner,
      changes: nft?.changes,
      forsale: nft?.forsale,
    }
    await this.db.write()
  }

  public async updateNFTSend(nft: NFT, consolidatedNFT: NFTConsolidated) {
    await this.db.read()
    let nftDb = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      changes: nft?.changes,
      owner: nft?.owner,
      rootowner: nft?.rootowner,
      forsale: BigInt(0),
    }
    await this.db.write()
  }

  public async updateNFTBurn(
    nft: NFT | NFTConsolidated,
    consolidatedNFT: NFTConsolidated
  ) {
    await this.db.read()
    let nftDb = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      burned: nft?.burned,
      changes: nft?.changes,
      forsale: BigInt(nft.forsale) > BigInt(0) ? BigInt(0) : nft.forsale,
    }
    await this.db.write()
  }

  public async updateNFTMint(nft: NFT) {
    this.db.data.nfts.push({
      ...nft,
      symbol: nft.symbol,
      id: nft.getId(),
    })
    await this.db.write()
  }

  public async updateCollectionMint(collection: CollectionConsolidated) {
    await this.db.read()
    this.db.data.collections.push(collection)
    await this.db.write()
    return
  }

  public async updateBase(base: Base) {
    await this.db.read()
    this.db.data.bases.push({
      ...base,
      id: base.getId(),
    })
    await this.db.write()
  }

  public async updateBaseThemeAdd(
    base: Base,
    consolidatedBase: BaseConsolidated
  ) {
    await this.db.read()
    this.db.data.bases.push({
      ...base,
      themes: base?.themes,
    })
    await this.db.write()
  }

  public async updateCollectionIssuer(
    collection,
    consolidatedCollection
  ) {
    await this.db.read()
    let collectionDb = this.db.data.collections.find(({ id }) => id === consolidatedCollection.id)
    collectionDb = {
      ...collectionDb,
      issuer: collection?.issuer,
      changes: collection?.changes,
    }
    await this.db.write()
  }

  public async updateBaseIssuer(
    base,
    consolidatedBase
  ) {
    await this.db.read()
    let baseDb = this.db.data.bases.find(({ id }) => id === consolidatedBase.id)
    baseDb = {
      ...baseDb,
      issuer: base?.issuer,
      changes: base?.changes,
    };
  }

  public async getNFTById(id: string) {
    await this.db.read()
    return this.db.data.nfts.find((nft) => nft.id === id)
  }

  public async getCollectionById(id: string) {
    await this.db.read()
    return this.db.data.collections.find((collection) => collection.id === id)
  }

  /**
   * Find existing NFT by id
   */
  public async getNFTByIdUnique(id: string) {
    await this.db.read()
    return this.db.data.nfts.find((nft) => nft.id === id)
  }

  public async getBaseById(id: string) {
    await this.db.read()
    return this.db.data.bases.find((base) => base.id === id)
  }
}
