import mongoose from "mongoose"
import { amountToHuman } from "../wallet/walletHelpers.js"
import randomNumber from "random-number-csprng"
import { botParams } from "../../config.js"
import BigNumber from "bignumber.js"

export interface IWallet{
    address: string,
    balance: string,
    linked: boolean,
    password: string,
    password_expiry: Date,
    date_of_entry: Date,
    getAccountDetails(): string,
    setPassword()
}

const Schema = mongoose.Schema
export const WalletSchema = new Schema({
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
    password_expiry: {
        type: Date,
        required: false
    },
    date_of_entry: {
        type: Date,
        default: Date.now()
    }
})

WalletSchema.methods.getAccountDetails = async function (this: IWallet) {
    let { value, tokenString } = await amountToHuman(this.balance)
    return `Address: ${this.address}\n\nBalance: ${value} ${tokenString}`
}

WalletSchema.methods.setPassword = async function (this: IWallet) {
    const now = new Date()
    const quarterAfter = new Date(now.getTime() + (15 * 60 * 1000))
    let code = await randomNumber(botParams.settings.pwordLower, botParams.settings.pwordUpper)
    this.password = new BigNumber(
        code.toString())
        .multipliedBy(new BigNumber("1e" + botParams.settings.pwordDigitsToAdd)).toString()
    this.password_expiry = quarterAfter
}

export default mongoose.model<IWallet>('wallet', WalletSchema);