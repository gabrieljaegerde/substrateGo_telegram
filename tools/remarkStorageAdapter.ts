import { Collection, NFT } from "rmrk-tools";
import { IConsolidatorAdapter } from "rmrk-tools/dist/tools/consolidator/adapters/types";
import { CollectionConsolidated, NFTConsolidated } from "rmrk-tools/dist/tools/consolidator/consolidator";
import _ from "lodash";
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
    this.db.chain = _.chain(this.db.data);
    this.db.chain.get("nfts")
      .find(({ id }) => id === consolidatedNFT.id)
      .assign({
        reactions: nft?.reactions,
        updatedAtBlock
      })
      .value();
    await this.db.write();
  }

  public async updateNFTList(nft: NFT,
    consolidatedNFT: NFTConsolidated,
    updatedAtBlock: number): Promise<void> {
    await this.db.read();
    this.db.chain = _.chain(this.db.data);
    this.db.chain.get("nfts")
      .find(({ id }) => id === consolidatedNFT.id)
      .assign({
        forsale: nft?.forsale,
        changes: nft?.changes,
        updatedAtBlock,
      })
      .value();
    await this.db.write();
  }

  public async updateNFTBuy(nft: NFT,
    consolidatedNFT: NFTConsolidated,
    updatedAtBlock: number): Promise<void> {
    await this.db.read();
    this.db.chain = _.chain(this.db.data);
    this.db.chain.get("nfts")
      .find(({ id }) => id === consolidatedNFT.id)
      .assign({
        owner: nft?.owner,
        changes: nft?.changes,
        forsale: nft?.forsale,
        updatedAtBlock
      })
      .value();
    await this.db.write();
  }

  public async updateNFTSend(nft: NFT,
    consolidatedNFT: NFTConsolidated,
    updatedAtBlock: number): Promise<void> {
    await this.db.read();
    this.db.chain = _.chain(this.db.data);
    this.db.chain.get("nfts")
      .find(({ id }) => id === consolidatedNFT.id)
      .assign({
        changes: nft?.changes,
        owner: nft?.owner,
        forsale: BigInt(0),
        updatedAtBlock
      })
      .value();
    await this.db.write();
  }

  public async updateNFTConsume(
    nft: NFT | NFTConsolidated,
    consolidatedNFT: NFTConsolidated,
    updatedAtBlock: number
  ): Promise<void> {
    await this.db.read();
    this.db.chain = _.chain(this.db.data);
    this.db.chain.get("nfts")
      .find(({ id }) => id === consolidatedNFT.id)
      .assign({
        burned: nft?.burned,
        changes: nft?.changes,
        forsale: BigInt(nft.forsale) > BigInt(0) ? BigInt(0) : nft.forsale,
        updatedAtBlock,
      })
      .value();
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
    // await this.db.read();
    // this.db.data.collections.push(collection);
    // await this.db.write();
    // const collectionDb = await this.getCollectionById(collection.id);
    // return collectionDb;
    return null;
  }

  public async updateCollectionIssuer(
    collection: Collection,
    consolidatedCollection: CollectionConsolidated,
    updatedAtBlock: number
  ): Promise<void> {
    await this.db.read();
    this.db.chain = _.chain(this.db.data);
    this.db.chain.get("collections")
      .find(({ id }) => id === consolidatedCollection.id)
      .assign({
        issuer: collection?.issuer,
        changes: collection?.changes,
        updatedAtBlock,
      })
      .value();
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
