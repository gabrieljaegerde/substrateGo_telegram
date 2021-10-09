import mongoose, { Types, Document } from "mongoose"

export interface IReward extends Document {
    createdAt: Date;
    treasureId: Types.ObjectId;
    finder: number;
    collected: boolean;
    name?: string;
    expiry: Date;
    dateCollected?: Date;
    txHash?: string;
    block?: number;
    file?: string;
    setCollected(txHash: string, block: number, metadataCid: string);
}

const Schema = mongoose.Schema
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
        }
    },
    { timestamps: true },
)

RewardSchema.methods.setCollected = function (this: IReward,
    txHash: string,
    block: number,
    metadataCid: string) {
    this.collected = true
    this.dateCollected = new Date()
    this.txHash = txHash
    this.block = block
    this.file = metadataCid
}

export default mongoose.model<IReward>('reward', RewardSchema);