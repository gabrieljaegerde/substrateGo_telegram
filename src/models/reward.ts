import mongoose, { Types, Document } from "mongoose";
import { ILocation, LocationSchema } from "./location.js";

export interface IReward extends Document {
    createdAt: Date;
    treasureId: Types.ObjectId;
    finder: number;
    location: ILocation;
    collected: boolean;
    name?: string;
    expiry: Date;
    dateCollected?: Date;
    txHash?: string;
    block?: number;
    file?: string;
    description: string;
    setCollected(txHash: string, block: number, metadataCid: string);
}

const Schema = mongoose.Schema;
const RewardSchema = new Schema(
    {
        treasureId: {
            type: mongoose.Schema.Types.ObjectId, ref: 'Treasure',
            required: true
        },
        finder: {
            type: Number,
            required: true
        },
        location: {
            type: LocationSchema,
            required: false
        },
        collected: {
            type: Boolean,
            default: true
        },
        name: {
            type: String,
            required: false,
        },
        expiry: {
            type: Date,
            required: true,
        },
        dateCollected: {
            type: Date,
            required: false,
        },
        txHash: {
            type: String,
            required: false
        },
        block: {
            type: Number,
            required: false
        },
        file: {
            type: String,
            required: false
        },
        description: {
            type: String,
            required: true
        }
    },
    { timestamps: true },
);

RewardSchema.methods.setCollected = function (this: IReward,
    txHash: string,
    block: number,
    metadataCid: string) {
    this.collected = true;
    this.dateCollected = new Date();
    this.txHash = txHash;
    this.block = block;
    this.file = metadataCid;
};

export default mongoose.model<IReward>('reward', RewardSchema);