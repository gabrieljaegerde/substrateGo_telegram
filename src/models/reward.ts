import mongoose, { Types, Document } from "mongoose"

export interface IReward extends Document{
    treasure_id: Types.ObjectId,
    finder: number,
    collected: boolean,
    name?: string,
    expiry: Date,
    date_collected?: Date,
    tx_hash?: string,
    block?: number,
    file?: string,
    date_of_entry: Date,
    setCollected(txHash: string, block: number, metadataCid: string, treasureName: string)
}

const Schema = mongoose.Schema
const RewardSchema = new Schema({
    treasure_id: {
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
    date_collected: {
        type: Date,
        required: false,
    },
    tx_hash: {
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
    date_of_entry: {
        type: Date,
        default: Date.now()
    }
})

RewardSchema.methods.setCollected = function (this: IReward, 
    txHash: string, 
    block: number, 
    metadataCid: string,
    treasureName: string) {
    this.collected = true
    this.date_collected = new Date()
    this.tx_hash = txHash
    this.block = block
    console.log("metadataCid", metadataCid)
    this.file = metadataCid
    this.name = treasureName
}

export default mongoose.model<IReward>('reward', RewardSchema);