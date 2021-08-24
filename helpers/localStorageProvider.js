import { botParams } from "../config.js"

export class LocalStorageProvider {
  constructor(storageKey) {
    this.set = async (latestBlock) => {
      botParams.localStorage.data[this.storageKey] = String(latestBlock)
      botParams.localStorage.write()
      //botParams.db.assign({this.storageKey, String(latestBlock));
    }
    this.get = async () => {
      botParams.localStorage.read()
      const latestBlockString = botParams.localStorage.data[this.storageKey]
      return latestBlockString ? parseInt(latestBlockString) : 0
    }
    this.storageKey = storageKey || "latestBlock"
  }
}
