import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../config.js"
import { Markup } from "telegraf"
import _ from "lodash"
import jsQR from "jsqr"
import { getTransactionCost, mintAndSend } from "../network/accountHandler.js"
//import { NFT } from 'rmrk-tools';
import pkg from 'rmrk-tools';
const { NFT } = pkg;
import { amountToHumanString, bigNumberArithmetic, bigNumberComparison } from "../wallet/walletHelpers.js"
import BigNumber from "bignumber.js"
import { INftProps, IUser } from "../types.js"

const claimNft = new MenuTemplate(async (ctx: any) => {
    ctx.session.remarks = null
    var loadMessage = await botParams.bot.telegram
        .sendMessage(ctx.chat.id, "Loading...")
    let treasure = botParams.db.chain.get("treasures").find({ id: ctx.session.qrId }).value()
    let nftProps: INftProps = {
        "block": 0,
        "collection": botParams.settings.collectionId,
        "symbol": "string",
        "transferable": 1,
        "sn": new Date().getTime().toString(),
        "metadata": `https://ipfs.io/ipfs/${treasure.nft}`
    }
    const nft = new NFT(
        nftProps
    )
    let remarks: Array<string> = []
    remarks.push(nft.mint(ctx.session.user.wallet.address))
    ctx.session.remarks = remarks
    let info = await getTransactionCost({
        type: "nft",
        recipient: ctx.session.user.wallet.address,
        toSendRemarks: remarks
    })
    botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
    let reply = `Receiving the NFT in your wallet will incur a ` +
        `fee of ${amountToHumanString(bigNumberArithmetic(info.partialFee, botParams.settings.creatorReward, "+"))} ` +
        `(${amountToHumanString(info.partialFee)} network fee + ${amountToHumanString(botParams.settings.creatorReward)} ` +
        `creator reward). Do you wish to proceed?`
    return reply
})

claimNft.interact("Proceed", "sp", {
    do: async (ctx: any) => {
        var loadMessage = await botParams.bot.telegram
            .sendMessage(ctx.chat.id, "Loading...")
        var user: IUser = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
        var { success, response, fee } = await mintAndSend(ctx.session.remarks, user)
        if (success) {
            botParams.db.read()
            botParams.db.chain = _.chain(botParams.db.data)
            //find user and decrease balance
            let user: IUser = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
            let totalCost = bigNumberArithmetic(fee, botParams.settings.creatorReward, "+")
            let coverableByRewards = bigNumberArithmetic(user.rewardBalance, totalCost, "-")
            if (bigNumberComparison(coverableByRewards, "0", "<")) {
                user.rewardBalance = "0"
                //since coverableByRewards is -ve this is actually subtraction
                user.wallet.balance = bigNumberArithmetic(user.wallet.balance, coverableByRewards, "+")
            }
            else {
                user.rewardBalance = coverableByRewards
            }
            let treasure = botParams.db.chain.get("treasures").find({ id: ctx.session.qrId }).value()
            let creator = botParams.db.chain.get("users").find({ chatid: treasure.creator }).value()
            creator.rewardBalance = bigNumberArithmetic(creator.rewardBalance, botParams.settings.creatorReward, "+")
            creator.totalRewardBalance = bigNumberArithmetic(creator.totalRewardBalance, botParams.settings.creatorReward, "+")
            await botParams.bot.telegram
                .sendMessage(creator.chatid, `Treasure '${treasure.name}' was just collected.\n\n` +
                    `${amountToHumanString(botParams.settings.creatorReward)} credited to your account.`)
            //check if scanned has an entry
            botParams.db.chain.get("scanned")
                .find({ finder: user.chatid, qrId: ctx.session.qrId })
                .assign({ collected: true, timestampCollected: new Date(), txHash: response }).value()
            botParams.db.write()
            await deleteMenuFromContext(ctx)
            var links = botParams.settings
                .getExtrinsicLinks(
                    botParams.settings.network.name,
                    response
                )
                .map(row => {
                    return row.map(link => {
                        return Markup.button.url(link[0], link[1])
                    })
                })
            let message = "Success. The NFT has been minted and sent to your wallet.\n" +
                `You can find it in 'My treasures' under the name: ${treasure.name}`
            await botParams.bot.telegram
                .sendMessage(ctx.chat.id, message, Markup.inlineKeyboard(links))
            if (treasure.nft != botParams.settings.defaultNft) {
                // var loadMessage = await botParams.bot.telegram
                //     .sendMessage(ctx.chat.id, "Loading...")
                let treasureDb = botParams.db.chain.get("treasures").find({ id: ctx.session.scannedDb.qrId }).value()
                var image: any = await fetch(`https://ipfs.io/ipfs/${treasureDb.nft}`)
                let buffer = await image.buffer()
                await botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
                ctx.replyWithMarkdown(
                    `Treasure '${treasureDb.name}' NFT:`,
                    Markup.keyboard(getKeyboard(ctx)).resize()
                )
                await botParams.bot.telegram
                    .sendPhoto(ctx.chat.id, { source: buffer })
            }
            if (treasure.message && treasure.message != "") {
                ctx.replyWithMarkdown(
                    `A message from the creator of this treasure:\n\n${treasure.message}`,
                    Markup.keyboard(getKeyboard(ctx)).resize()
                )
            }
            ctx.session.remark = null
            return false
        }
        //if cannot cover transaction cost
        else if (response === "topup") {
            let message = "You do not have enough funds to pay for this transaction. " +
                "Please top up your balance by going to the main menu and " +
                "clicking on 'Account Settings'. " +
                "I have saved this treasure for you and you can still claim it within the next 30 days. " +
                "To claim it, simply click on '🎁 My treasures' in the Finder menu."
            botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
            await deleteMenuFromContext(ctx)
            ctx.replyWithMarkdown(
                message,
                Markup.keyboard(getKeyboard(ctx)).resize()
            )
            return false
        }
        //if error: response = null
        else {
            botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
            ctx.replyWithMarkdown(
                "A problem occured while collecting your NFT. Please try again",
                Markup.keyboard(getKeyboard(ctx)).resize()
            )
            return false
        }
    },
    joinLastRow: true,
})

claimNft.interact("Cancel", "sc", {
    do: async (ctx: any) => {
        ctx.session.remark = null
        await deleteMenuFromContext(ctx)
        let message = "You have NOT claimed this treasure. " +
            "But I have saved it for you and you can still claim it within the next 30 days. " +
            "To claim it, simply click on '🎁 My treasures' in the Finder menu."
        ctx.replyWithMarkdown(
            message,
            Markup.keyboard(getKeyboard(ctx)).resize()
        )
        return false
    },
    joinLastRow: true,
})

const claimNftMiddleware = new MenuMiddleware('nft/', claimNft)

export {
    claimNftMiddleware
}
