import {
  Collection,
  NFT,
  Base,
} from "rmrk-tools"
import { botParams } from "../../config.js"


export class RemarkStorageAdapter {

  constructor() {
  }

  async getAllNFTs() {
    botParams.remarkStorage.read()
    return botParams.remarkStorage.nfts;
  }

  async getAllCollections() {
    botParams.remarkStorage.read()
    return botParams.remarkStorage.collections;
  }

  async getAllBases() {
    botParams.remarkStorage.read()
    return botParams.remarkStorage.bases;
  }

  async updateNFTEmote(nft, consolidatedNFT) {
    botParams.remarkStorage.read()
    const nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      reactions: nft?.reactions,
    };
  }

  async updateBaseEquippable(
    base,
    consolidatedBase
  ) {
    botParams.remarkStorage.read()
    const baseDb = botParams.remarkStorage.data.bases.find(({ id }) => id === consolidatedBase.id)
    baseDb = {
      ...baseDb,
      parts: base?.parts,
    }
    botParams.remarkStorage.write()
  }

  async updateNFTList(nft, consolidatedNFT) {
    console.log("whassup")
    botParams.remarkStorage.read()
    const nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      forsale: nft?.forsale,
      changes: nft?.changes,
    }
    botParams.remarkStorage.write()
  }

  async updateEquip(nft, consolidatedNFT) {
    botParams.remarkStorage.read()
    const nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      children: nft.children,
    }
    botParams.remarkStorage.write()
  }

  async updateSetPriority(nft, consolidatedNFT) {
    botParams.remarkStorage.read()
    const nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      priority: nft.priority,
    }
    botParams.remarkStorage.write()
  }

  async updateNftAccept({
    nft,
    consolidatedNFT,
    entity
  }) {
    botParams.remarkStorage.read()
    const nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
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

  async updateNftResadd(nft, consolidatedNFT) {
    botParams.remarkStorage.read()
    const nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      resources: nft?.resources,
      priority: nft?.priority || nftDb.priority,
    }
  }

  async updateNFTBuy(nft, consolidatedNFT) {
    botParams.remarkStorage.read()
    const nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      owner: nft?.owner,
      changes: nft?.changes,
      forsale: nft?.forsale,
    }
    botParams.remarkStorage.write()
  }

  async updateNFTSend(nft, consolidatedNFT) {
    botParams.remarkStorage.read()
    const nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      changes: nft?.changes,
      owner: nft?.owner,
      rootowner: nft?.rootowner,
      forsale: BigInt(0),
    }
    botParams.remarkStorage.write()
  }

  async updateNFTBurn(nft, consolidatedNFT) {
    botParams.remarkStorage.read()
    const nftDb = botParams.remarkStorage.data.nfts.find(({ id }) => id === consolidatedNFT.id)
    nftDb = {
      ...nftDb,
      burned: nft?.burned,
      changes: nft?.changes,
      forsale: BigInt(nft.forsale) > BigInt(0) ? BigInt(0) : nft.forsale,
    }
    botParams.remarkStorage.write()
  }

  updateNFTMint(nft) {
    botParams.remarkStorage.data.nfts.push({
      ...nft,
      symbol: nft.symbol,
      id: nft.getId(),
    })
    BigInt.prototype.toJSON = function () {
      return this.toString()
    }
    botParams.remarkStorage.write()
    return
  }

  updateCollectionMint(collection) {
    botParams.remarkStorage.data.collections.push(collection)
    botParams.remarkStorage.write()
    return
  }

  async updateBase(base) {
    botParams.remarkStorage.data.bases.push({
      ...base,
      id: base.getId(),
    })
    botParams.remarkStorage.write()
    return
  }

  async updateCollectionIssuer(
    collection,
    consolidatedCollection
  ) {
    botParams.remarkStorage.read()
    const collectionDb = botParams.remarkStorage.data.collections.find(({ id }) => id === consolidatedCollection.id)
    collectionDb = {
      ...collectionDb,
      issuer: collection?.issuer,
      changes: collection?.changes,
    }
    botParams.remarkStorage.write()
  }

  async updateBaseIssuer(
    base,
    consolidatedBase
  ) {
    botParams.remarkStorage.read()
    const baseDb = botParams.remarkStorage.data.bases.find(({ id }) => id === consolidatedBase.id)
    baseDb = {
      ...baseDb,
      issuer: base?.issuer,
      changes: base?.changes,
    };
  }

  async getNFTById(id) {
    botParams.remarkStorage.read()
    return botParams.remarkStorage.data.nfts.find((nft) => nft.id === id)
  }

  async getCollectionById(id) {
    botParams.remarkStorage.read()
    console.log("id", id)
    console.log("here", botParams.remarkStorage.data.collections.find((collection) => collection.id === id))
    return botParams.remarkStorage.data.collections.find((collection) => collection.id === id)
  }

  /**
   * Find existing NFT by id
   */
  async getNFTByIdUnique(id) {
    botParams.remarkStorage.read()
    return botParams.remarkStorage.data.nfts.find((nft) => nft.id === id)
  }

  async getBaseById(id) {
    botParams.remarkStorage.read()
    return botParams.remarkStorage.data.bases.find((base) => base.id === id)
  }
}
