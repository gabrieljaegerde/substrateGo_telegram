import mongoose, { Document } from "mongoose";
import { bigNumberArithmetic, bigNumberComparison } from "../../tools/utils.js";
import { WalletSchema } from "./wallet.js";
import { botParams } from "../../config.js";
import { IWallet } from "./wallet.js";

export enum USER_TYPES {
    PRIVATE = "private",
    GROUP = "group",
}

export interface IUser extends Document {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
    chatId: number;
    language: string;
    type: USER_TYPES;
    isBot: boolean;
    totalRewardBalance: string;
    rewardBalance: string;
    wallet: IWallet;
    oldWallets: IWallet[];
    blocked: boolean;
    getBalance(): string;
    balanceGreaterThan(amount: string, userBalance?: string): boolean;
    balanceGreaterThanOrEqual(amount: string, userBalance?: string): boolean;
    mintAllowed(fee: string, userBalance?: string): boolean;
    withdrawalAllowed(amount: string, userBalance?: string): boolean;
    subtractFromBalance(amount: string);
    addReward();
}

const Schema = mongoose.Schema;
const UserSchema = new Schema(
    {
        firstName: {
            type: String,
            required: false
        },
        lastName: {
            type: String,
        },
        username: {
            type: String,
            required: false
        },
        chatId: {
            type: Number,
            required: true,
            index: true,
            unique: true,
        },
        language: {
            type: String,
            default: "en",
        },
        type: {
            type: String,
            enum: [USER_TYPES.PRIVATE, USER_TYPES.GROUP],
            required: true
        },
        isBot: {
            type: Boolean,
        },
        totalRewardBalance: {
            type: String,
            required: true,
            default: "0"
        },
        rewardBalance: {
            type: String,
            required: true,
            default: "0"
        },
        wallet: {
            type: WalletSchema,
            required: false
        },
        oldWallets: {
            type: [WalletSchema],
            default: []
        },
        blocked: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true },
);

UserSchema.methods.getBalance = function (this: IUser): string {
    return bigNumberArithmetic(this.wallet && this.wallet.balance ?
        this.wallet.balance : "0", this.rewardBalance, "+");
};

UserSchema.methods.balanceGreaterThanOrEqual = function (this: IUser, amount: string, userBalance?: string): boolean {
    if (userBalance) {
        return bigNumberComparison(userBalance, amount, ">=");
    }
    return bigNumberComparison(this.getBalance(), amount, ">=");
};

UserSchema.methods.balanceGreaterThan = function (this: IUser, amount: string, userBalance?: string): boolean {
    if (userBalance) {
        return bigNumberComparison(userBalance, amount, ">");
    }
    return bigNumberComparison(this.getBalance(), amount, ">");
};

UserSchema.methods.withdrawalAllowed = function (this: IUser, amount: string, userBalance?: string): boolean {
    if (userBalance) {
        return this.balanceGreaterThanOrEqual(amount, userBalance);
    }
    const balance = this.getBalance();
    return this.balanceGreaterThanOrEqual(amount, balance);
};

UserSchema.methods.mintAllowed = function (this: IUser, amount: string, userBalance?: string): boolean {
    if (userBalance) {
        return this.balanceGreaterThan(amount, userBalance);
    }
    const balance = this.getBalance();
    return this.balanceGreaterThan(amount, balance);
};

UserSchema.methods.subtractFromBalance = function (this: IUser, amount: string) {
    const coverableByRewards = bigNumberArithmetic(this.rewardBalance, amount, "-");
    if (bigNumberComparison(coverableByRewards, "0", "<")) {
        this.rewardBalance = "0";
        //since coverableByRewards is -ve this is actually subtraction
        this.wallet.balance = bigNumberArithmetic(this.wallet.balance, coverableByRewards, "+");
    }
    else {
        this.rewardBalance = coverableByRewards;
    }
};

UserSchema.methods.addReward = function (this: IUser) {
    this.rewardBalance = bigNumberArithmetic(this.rewardBalance, botParams.settings.creatorReward, "+");
    this.totalRewardBalance = bigNumberArithmetic(this.totalRewardBalance, botParams.settings.creatorReward, "+");
};

export default mongoose.model<IUser>('user', UserSchema);