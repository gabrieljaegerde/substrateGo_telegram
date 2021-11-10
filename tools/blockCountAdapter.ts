import { IStorageProvider } from "rmrk-tools/dist/listener";

export class blockCountAdapter implements IStorageProvider {
  readonly storageKey: string;
  private db: any;
  public constructor(db: any, storageKey?: string) {
    this.storageKey = storageKey || "latestBlock";
    this.db = db;
  }

  public async set(latestBlock: number): Promise<void> {
    this.db.data[this.storageKey] = String(latestBlock);
    await this.db.write();
  }

  public async get(): Promise<number> {
    await this.db.read();
    const latestBlockString = this.db.data[this.storageKey];
    return latestBlockString ? parseInt(latestBlockString) : 0;
  }
}
