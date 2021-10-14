export class blockCountAdapter {
  readonly storageKey: string;
  private db: any;
  public constructor(db: any, storageKey?: string) {
    this.storageKey = storageKey || "latestBlock";
    this.db = db;
  }

  public async set(latestBlock: number): Promise<void> {
    this.db.data[this.storageKey] = String(latestBlock);
    this.db.write();
  }

  public async get(): Promise<number> {
    this.db.read();
    const latestBlockString = this.db.data[this.storageKey];
    return latestBlockString ? parseInt(latestBlockString) : 0;
  }
}
