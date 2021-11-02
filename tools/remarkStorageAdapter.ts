import { Collection, NFT } from "rmrk-tools";
import { IConsolidatorAdapter } from "rmrk-tools/dist/tools/consolidator/adapters/types";
import { CollectionConsolidated, NFTConsolidated } from "rmrk-tools/dist/tools/consolidator/consolidator";

//@ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

export class RemarkStorageAdapter implements IConsolidatorAdapter {
  private db;
  constructor(db) {
    this.db = db;
  }

  public async getAllNFTs() {
    await this.db.read();
    return this.db.nfts;
  }

  public async getAllCollections() {
    await this.db.read();
    return this.db.collections;
  }

  public async getAllBases() {
    await this.db.read();
    return this.db.bases;
  }

  public async updateNFTEmote(nft: NFT,
    consolidatedNFT: NFTConsolidated,
    updatedAtBlock: number): Promise<void> {
    await this.db.read();
    let nftDb: NFTConsolidated = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id);
    nftDb = {
      ...nftDb,
      reactions: nft?.reactions,
      updatedAtBlock
    };
    await this.db.write();
  }

  public async updateNFTList(nft: NFT, 
    consolidatedNFT: NFTConsolidated, 
    updatedAtBlock: number): Promise<void> {
    await this.db.read();
    let nftDb: NFTConsolidated = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id);
    nftDb = {
      ...nftDb,
      forsale: nft?.forsale,
      changes: nft?.changes,
      updatedAtBlock,
    };
    await this.db.write();
  }

  public async updateNFTBuy(nft: NFT, 
    consolidatedNFT: NFTConsolidated,
    updatedAtBlock: number): Promise<void> {
    await this.db.read();
    let nftDb: NFTConsolidated = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id);
    nftDb = {
      ...nftDb,
      owner: nft?.owner,
      changes: nft?.changes,
      forsale: nft?.forsale,
      updatedAtBlock
    };
    await this.db.write();
  }

  public async updateNFTSend(nft: NFT, 
    consolidatedNFT: NFTConsolidated,
    updatedAtBlock: number): Promise<void> {
    await this.db.read();
    let nftDb: NFTConsolidated = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id);
    nftDb = {
      ...nftDb,
      changes: nft?.changes,
      owner: nft?.owner,
      forsale: BigInt(0),
      updatedAtBlock
    };
    await this.db.write();
  }

  public async updateNFTConsume(
    nft: NFT | NFTConsolidated,
    consolidatedNFT: NFTConsolidated,
    updatedAtBlock: number
  ): Promise<void> {
    await this.db.read();
    let nftDb: NFTConsolidated = this.db.data.nfts.find(({ id }) => id === consolidatedNFT.id);
    nftDb = {
      ...nftDb,
      burned: nft?.burned,
      changes: nft?.changes,
      forsale: BigInt(nft.forsale) > BigInt(0) ? BigInt(0) : nft.forsale,
      updatedAtBlock,
    };
    await this.db.write();
  }

  public async updateNFTMint(nft: NFT, updatedAtBlock: number): Promise<void> {
    await this.db.read();
    this.db.data.nfts.push({
      ...nft,
      instance: nft.instance,
      id: nft.getId(),
      updatedAtBlock: nft.updatedAtBlock || updatedAtBlock,
    });
    await this.db.write();
  }

  public async updateCollectionMint(collection: CollectionConsolidated): Promise<CollectionConsolidated> {
    await this.db.read();
    this.db.data.collections.push(collection);
    await this.db.write();
    const collectionDb = await this.getCollectionById(collection.id);
    return collectionDb
    return null;
  }

  public async updateCollectionIssuer(
    collection: Collection,
    consolidatedCollection: CollectionConsolidated,
    updatedAtBlock: number
  ): Promise<void> {
    await this.db.read();
    let collectionDb: CollectionConsolidated = this.db.data.collections.find(({ id }) => id === consolidatedCollection.id);
    collectionDb = {
      ...collectionDb,
      issuer: collection?.issuer,
      changes: collection?.changes,
      updatedAtBlock,
    };
    await this.db.write();
  }

  public async getNFTById(NFTId: string): Promise<NFTConsolidated> {
    await this.db.read();
    return this.db.data.nfts.find(({ id }) => id === NFTId);
  }

  public async getCollectionById(collectionId: string): Promise<CollectionConsolidated> {
    await this.db.read();
    return this.db.data.collections.find(({ id }) => id === collectionId);
  }

  /**
   * Find existing NFT by id
   */
  public async getNFTByIdUnique(NFTId: string): Promise<NFTConsolidated> {
    await this.db.read();
    return this.db.data.nfts.find(({ id }) => id === NFTId);
  }
}
