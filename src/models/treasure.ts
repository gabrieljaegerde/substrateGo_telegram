import mongoose, { Document } from "mongoose"
import Reward from "./reward.js"
import { LocationSchema } from "./location.js"
import { ILocation } from "./location.js"
import { IReward } from "./reward.js"

export interface ITreasure extends Document {
    name: string,
    code: string,
    location: ILocation,
    creator: number,
    active: boolean,
    hint: string,
    description: string,
    file: string,
    date_of_entry: Date,
    howManyCollected(): Promise<number>,
    checkIfAlreadyCollected(userId: number): Promise<boolean>
}

const Schema = mongoose.Schema
const TreasureSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    location: {
        type: LocationSchema,
        required: false
    },
    creator: {
        type: Number,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
    hint: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    file: {
        type: String,
        required: true
    },
    date_of_entry: {
        type: Date,
        default: Date.now()
    }
})

TreasureSchema.methods.howManyCollected = async function (this: ITreasure): Promise<number> {
    var allRewards: Array<IReward> = await Reward.find({ treasure_id: this._id, collected: true })
    return allRewards.length
}

TreasureSchema.methods.checkIfAlreadyCollected = async function (this: ITreasure, userId: number): Promise<boolean> {
    var reward: IReward = await Reward.findOne({ treasure_id: this._id, finder: userId })
    return reward ? true : false
}

export default mongoose.model<ITreasure>('treasure', TreasureSchema);