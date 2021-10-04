import mongoose, { Document } from "mongoose"
import { bigNumberArithmetic, bigNumberComparison } from "../wallet/walletHelpers.js";
import { WalletSchema } from "./wallet.js"
import { botParams } from "../../config.js"
import { IWallet } from "./wallet.js"

export interface IUser extends Document {
    _id: string,
    first_name: string,
    username: string,
    chat_id: number,
    type: "private" | "group",
    total_reward_balance: string,
    reward_balance: string,
    wallet: IWallet,
    old_wallets: Array<IWallet>,
    blocked: boolean,
    date_of_entry: Date,
    getBalance(): string,
    balanceGreaterThan(amount: string, userBalance?: string): boolean,
    balanceGreaterThanOrEqual(amount: string, userBalance?: string): boolean,
    mintAllowed(fee: string, userBalance?: string): boolean,
    withdrawalAllowed(amount: string, userBalance?: string): boolean,
    subtractFromBalance(amount: string),
    addReward()
}

const Schema = mongoose.Schema
const UserSchema = new Schema({
    first_name: {
        type: String,
        required: false
    },
    username: {
        type: String,
        required: false
    },
    chat_id: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ["private", "group"],
        required: true
    },
    total_reward_balance: {
        type: String,
        required: true,
        default: "0"
    },
    reward_balance: {
        type: String,
        required: true,
        default: "0"
    },
    wallet: {
        type: WalletSchema
    },
    old_wallets: {
        type: [WalletSchema],
        default: []
    },
    blocked: {
        type: Boolean,
        default: false
    },
    date_of_entry: {
        type: Date,
        default: new Date()
    }
});

UserSchema.methods.getBalance = function (this: IUser): string {
    return bigNumberArithmetic(this.wallet && this.wallet.balance ?
        this.wallet.balance : "0", this.reward_balance, "+")
}

UserSchema.methods.balanceGreaterThanOrEqual = function (this: IUser, amount: string, userBalance?: string): boolean {
    if (userBalance) {
        return bigNumberComparison(userBalance, amount, ">=")
    }
    return bigNumberComparison(this.getBalance(), amount, ">=")
}

UserSchema.methods.balanceGreaterThan = function (this: IUser, amount: string, userBalance?: string): boolean {
    if (userBalance) {
        return bigNumberComparison(userBalance, amount, ">")
    }
    return bigNumberComparison(this.getBalance(), amount, ">")
}

UserSchema.methods.withdrawalAllowed = function (this: IUser, amount: string, userBalance?: string): boolean {
    if (userBalance) {
        return this.balanceGreaterThanOrEqual(amount, userBalance)
    }
    let balance = this.getBalance()
    return this.balanceGreaterThanOrEqual(amount, balance)
}

UserSchema.methods.mintAllowed = function (this: IUser, amount: string, userBalance?: string): boolean {
    if (userBalance) {
        return this.balanceGreaterThan(amount, userBalance)
    }
    let balance = this.getBalance()
    console.log("balance", balance)
    console.log("amount", amount)
    console.log("balanceGreaterThan(balance, amount)", this.balanceGreaterThan(amount, balance))
    return this.balanceGreaterThan(amount, balance)
}

UserSchema.methods.subtractFromBalance = function (this: IUser, amount: string) {
    var coverableByRewards = bigNumberArithmetic(this.reward_balance, amount, "-")
    if (bigNumberComparison(coverableByRewards, "0", "<")) {
        this.reward_balance = "0"
        //since coverableByRewards is -ve this is actually subtraction
        this.wallet.balance = bigNumberArithmetic(this.wallet.balance, coverableByRewards, "+")
    }
    else {
        this.reward_balance = coverableByRewards
    }
}

UserSchema.methods.addReward = function (this: IUser) {
    this.reward_balance = bigNumberArithmetic(this.reward_balance, botParams.settings.creatorReward, "+")
    this.total_reward_balance = bigNumberArithmetic(this.total_reward_balance, botParams.settings.creatorReward, "+")
}

export default mongoose.model<IUser>('user', UserSchema);