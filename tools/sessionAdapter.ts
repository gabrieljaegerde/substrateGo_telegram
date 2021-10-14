import { StorageAdapter } from 'grammy';

export class sessionAdapter<T> implements StorageAdapter<T> {
    private collection: any;

    constructor(db) {
        this.collection = db.collection("sessions");
    }

    async read(key: string): Promise<T> {
        const session = await this.collection.findOne({ key });

        if (session === null || session === undefined) {
            return undefined;
        }
        return JSON.parse(session.value) as unknown as T;
    }

    async write(key: string, data: T): Promise<void> {
        const session = await this.collection.findOne({ key }, { select: ['key'] });
        const value = JSON.stringify(data);

        if (session !== null && session !== undefined) {
            await this.collection.updateOne({ key }, { $set: { value } }, { upsert: true });
        } else {
            await this.collection.insertOne({ key, value });
        }
    }

    async delete(key: string): Promise<void> {
        await this.collection.delete({ key });
    }
}