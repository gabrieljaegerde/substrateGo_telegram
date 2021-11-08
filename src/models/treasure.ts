import mongoose, { Document } from "mongoose";
import Reward from "./reward.js";
import { ILocation, LocationSchema } from "./location.js";
import { IReward } from "./reward.js";
import User, { IUser } from "./user.js";


export interface ITreasure extends Document {
    createdAt: Date;
    name: string;
    code: string;
    location: ILocation;
    creator: number;
    active: boolean;
    hint: string;
    description: string;
    file: string;
    visible: boolean;
    howManyCollected(): Promise<number>;
    checkIfAlreadyCollected(userId: number): Promise<boolean>;
    getCreator(): Promise<IUser>;
}

const Schema = mongoose.Schema;
const TreasureSchema = new Schema(
    {
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
        visible: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

TreasureSchema.methods.howManyCollected = async function (this: ITreasure): Promise<number> {
    const allRewards: IReward[] = await Reward.find({ treasureId: this._id, collected: true });
    return allRewards.length;
};

TreasureSchema.methods.checkIfAlreadyCollected = async function (this: ITreasure, userId: number): Promise<boolean> {
    return await Reward.exists({ treasureId: this._id, finder: userId });
};

TreasureSchema.methods.getCreator = async function (this: ITreasure): Promise<IUser> {
    return await User.findOne({ chatId: this.creator });
};

export default mongoose.model<ITreasure>('treasure', TreasureSchema);