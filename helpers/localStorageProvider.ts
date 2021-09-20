import { botParams } from "../config.js"

export class LocalStorageProvider {
  readonly storageKey: string
  public constructor(storageKey?: string) {
    this.storageKey = storageKey || "latestBlock"
  }

  public async set(latestBlock: number): Promise<void> {
    botParams.localStorage.data[this.storageKey] = String(latestBlock)
    botParams.localStorage.write()
  }

  public async get(): Promise<number> {
    botParams.localStorage.read()
    const latestBlockString = botParams.localStorage.data[this.storageKey]
    return latestBlockString ? parseInt(latestBlockString) : 0
  }
}
