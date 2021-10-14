import mongoose from "mongoose";
import { amountToHuman, bigNumberArithmetic } from "../../tools/utils.js";
import randomNumber from "random-number-csprng";
import { botParams } from "../../config.js";

export interface IWallet {
    address: string;
    balance: string;
    linked: boolean;
    password: string;
    passwordExpiry: Date;
    getAccountDetails(): string;
    setPassword();
    passwordExpired();
}

const Schema = mongoose.Schema;
export const WalletSchema = new Schema(
    {
        address: {
            type: String,
            required: true
        },
        balance: {
            type: String,
            default: "0"
        },
        linked: {
            type: Boolean,
            default: false
        },
        password: {
            type: String,
            required: false
        },
        passwordExpiry: {
            type: Date,
            required: false
        }
    },
    { timestamps: true }
);

WalletSchema.methods.getAccountDetails = async function (this: IWallet) {
    const { value, tokenString } = await amountToHuman(this.balance);
    return `Address: ${this.address}\n\nBalance: ${value} ${tokenString}`;
};

WalletSchema.methods.setPassword = async function (this: IWallet) {
    const now = new Date();
    const quarterAfter = new Date(now.getTime() + (15 * 60 * 1000));
    const code = await randomNumber(botParams.settings.pwordLower, botParams.settings.pwordUpper);
    this.password = bigNumberArithmetic(code, "1e" + botParams.settings.pwordDigitsToAdd, "*");
    this.passwordExpiry = quarterAfter;
};

WalletSchema.methods.passwordExpired = function (this: IWallet) {
    return this.passwordExpiry < new Date();
};

export default mongoose.model<IWallet>('wallet', WalletSchema);