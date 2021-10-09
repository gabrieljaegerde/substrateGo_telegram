import { botParams, getKeyboard } from "../../config.js"
import _ from "lodash"
import { checkAddress } from "@polkadot/util-crypto"
import { StatelessQuestion } from '@grammyjs/stateless-question';
import User, { IUser } from "../models/user.js"
import Wallet, { IWallet } from "../models/wallet.js"
import { linkAddress } from "./linkAddress.js"
import { CustomContext } from "../../types/CustomContext.js"

export const enterAddress = new StatelessQuestion("adr", async (ctx: CustomContext) => {
    const user: IUser = await User.findOne({ chatId: ctx.chat.id })
    let isValid
    try {
        isValid = checkAddress(
            ctx.message.text,
            parseInt(botParams.settings.network.prefix)
        )[0]
    } catch (error) {
        isValid = false
    }
    if (!isValid) {
        const message = "Incorrect address. Please try again."
        enterAddress.replyWithMarkdown(ctx, message)
        return
    }
    const wallet: IWallet = user.wallet
    const newWallet: IWallet = new Wallet({
        address: ctx.message.text,
        balance: wallet && wallet.balance ? wallet.balance : "0",
        linked: false,
        password: null,
        passwordExpiry: null
    })
    //user is adding current address again
    if (wallet && wallet.address === newWallet.address && !wallet.linked) {
        //update pword and extend expiry
        user.wallet.setPassword()
    }
    else if (wallet && wallet.address === newWallet.address && wallet.linked) {
        const message = "This address is already linked to your account. Any deposit you make will be " +
            "credited to this account. ALWAYS make sure that your wallet is still linked to your account " +
            "before making a deposit."
        await ctx.reply(message, {
            reply_markup: {
                keyboard: (await getKeyboard(ctx)).build(),
                resize_keyboard: true
            },
        })
        return
    }
    //user is wishing to add a new wallet address
    else if (wallet && wallet.address != newWallet.address) {
        user.oldWallets.push(wallet)
        user.wallet = newWallet
    }
    else if (!wallet) {
        user.wallet = newWallet
    }
    await user.save()
    linkAddress(ctx)
})