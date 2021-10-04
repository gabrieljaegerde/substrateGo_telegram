import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import { Markup } from "telegraf"
import _ from "lodash"
import jsQR from "jsqr"
import { getTransactionCost, mintAndSend } from "../../network/accountHandler.js"
//import { NFT } from 'rmrk-tools';
import pkg from 'rmrk-tools';
const { NFT } = pkg;
import { amountToHumanString, bigNumberArithmetic, bigNumberComparison } from "../../wallet/walletHelpers.js"
import BigNumber from "bignumber.js"
import Treasure, { ITreasure } from "../../models/treasure.js"
import Reward, { IReward } from "../../models/reward.js"
import User, { IUser } from "../../models/user.js"
import fetch from "node-fetch"
import { encodeAddress } from "@polkadot/util-crypto"
import { pinSingleMetadataWithoutFile } from "../../../tools/pinataUtils.js"

const claimNft = new MenuTemplate(async (ctx: any) => {
    ctx.session.remarks = null
    var loadMessage = await botParams.bot.telegram
        .sendMessage(ctx.chat.id, "Loading...")
    let treasure: ITreasure = await Treasure.findOne({ code: ctx.session.qrId })
    let reward: IReward = await Reward.findOne({ finder: ctx.chat.id, treasure_id: treasure._id })
    var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
    //can sn only be 8 digits?
    const nft = new NFT({
        block: 0,
        sn: reward._id,
        owner: encodeAddress(botParams.account.address, 2),
        transferable: 1,
        metadata: treasure.file, //use this as a placeholder. actual metadata different
        collection: botParams.settings.collectionId,
        symbol: treasure.name,
    })
    ctx.session.nft = nft
    let remarks: Array<string> = []
    remarks.push(nft.mint())
    let info = await getTransactionCost({
        type: "nft",
        recipient: user.wallet.address,
        toSendRemarks: remarks
    })
    botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
    let reply = `Receiving the NFT in your wallet will incur a total ` +
        `*fee* of _${amountToHumanString(bigNumberArithmetic(info.partialFee, botParams.settings.creatorReward, "+"))}_\n\n` +
        `*Network fee:* _${amountToHumanString(info.partialFee)}_\n*Creator Reward:* _${amountToHumanString(botParams.settings.creatorReward)}_\n\n` +
        `Do you wish to proceed?`
    return { text: reply, parse_mode: 'Markdown' }

})

claimNft.interact("Proceed", "sp", {
    do: async (ctx: any) => {
        var loadMessage = await botParams.bot.telegram
            .sendMessage(ctx.chat.id, "Loading...")
        var user: IUser = await User.findOne({ chat_id: ctx.chat.id })
        var treasure: ITreasure = await Treasure.findOne({ code: ctx.session.qrId })
        var reward: IReward = await Reward.findOne({ finder: user.chat_id, treasure_id: treasure._id })
        console.log("ITreasure", treasure)
        try {
            const metadataCid = await pinSingleMetadataWithoutFile(treasure.file, `Reward:${reward._id}`, {
                description: treasure.description,
                external_url: "https://subylo.com",
                properties: {
                    rarity: {
                        type: "string",
                        value: "common",
                    },
                    creator: {
                        type: "int",
                        value: treasure.creator
                    },
                    location: {
                        type: "string",
                        value: `lat: ${treasure.location.latitude}, lng: ${treasure.location.longitude}`
                    },
                    name: {
                        type: "string",
                        value: treasure.name
                    },
                    id: {
                        type: "string",
                        value: reward._id
                    }
                },
            })
            if (metadataCid === "") {
                console.error("empty metadataCid")
                throw Error
            }
            ctx.session.nft.metadata = metadataCid

            let remarks: Array<string> = []
            remarks.push(ctx.session.nft.mint())

            const { block, success, hash, fee, topupRequired } = await mintAndSend(remarks, user)

            if (success) {
                //find user and decrease balance
                let totalCost = bigNumberArithmetic(fee, botParams.settings.creatorReward, "+")
                user.subtractFromBalance(totalCost)

                //add creator-reward ($) to creator balance
                let creator: IUser = await User.findOne({ chat_id: treasure.creator })
                creator.addReward()

                //set finder-reward (NFT) as collected
                console.log("metadataCid", metadataCid)
                reward.setCollected(hash.toString(), block, metadataCid, treasure.name)
                console.log("reward", reward)
                //save all db changes
                await user.save()
                await reward.save()
                await creator.save()

                await deleteMenuFromContext(ctx)

                //send message to creator
                await botParams.bot.telegram
                    .sendMessage(creator.chat_id, `Treasure '${treasure.name}' was just collected.\n\n` +
                        `${amountToHumanString(botParams.settings.creatorReward)} credited to your account.`)

                console.log("hash", hash)
                console.log("hash2", hash.toString())
                //send message to finder
                var links = botParams.settings
                    .getExtrinsicLinks(
                        botParams.settings.network.name,
                        hash
                    )
                    .map(row => {
                        return row.map(link => {
                            return Markup.button.url(link[0], link[1])
                        })
                    })
                let message = "Success. The NFT has been minted and sent to your wallet.\n" +
                    `You can find it in 'My treasures' under the name: ${reward.name}`
                await botParams.bot.telegram
                    .sendMessage(ctx.chat.id, message, Markup.inlineKeyboard(links))
                if (reward.file != botParams.settings.defaultFile) {
                    // var loadMessage = await botParams.bot.telegram
                    //     .sendMessage(ctx.chat.id, "Loading...")
                    var response: any = await fetch(reward.file.replace('ipfs://','https://ipfs.io/'))
                    var json: any = await response.json()
                    var image: any = await fetch(json.image.replace('ipfs://','https://ipfs.io/'))
                    let buffer = await image.buffer()
                    await botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
                    ctx.replyWithMarkdown(
                        `Treasure '${treasure.name}' NFT:`,
                        Markup.keyboard(await getKeyboard(ctx)).resize()
                    )
                    await botParams.bot.telegram
                        .sendPhoto(ctx.chat.id, { source: buffer })
                }
                //fix this up
                // if (treasure.description && treasure.description != "") {
                //     ctx.replyWithMarkdown(
                //         `A message from the creator of this treasure:\n\n${treasure.description}`,
                //         Markup.keyboard(await getKeyboard(ctx)).resize()
                //     )
                // }
                ctx.session.remark = null
                return false
            }
            //if cannot cover transaction cost
            else if (topupRequired) {
                let message = "You do not have enough funds to pay for this transaction.\n\n" +
                    "Please top up your balance by going to the main menu and " +
                    "clicking on _'Account Settings'_.\n\n" +
                    "_I have saved this treasure for you and you can still claim it within the next 30 days. " +
                    "To claim it, simply click on '🎁 My treasures' in the Finder menu._"
                botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
                await deleteMenuFromContext(ctx)
                ctx.replyWithMarkdown(
                    message,
                    Markup.keyboard(await getKeyboard(ctx)).resize()
                )
                return false
            }
            //if error: response = null
            else {
                botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
                ctx.replyWithMarkdown(
                    "A problem occured while collecting your NFT. Please try again",
                    Markup.keyboard(await getKeyboard(ctx)).resize()
                )
                return false
            }
        } catch (error: any) {
            console.error(error);
        }
    },
    joinLastRow: true,
})

claimNft.interact("Cancel", "sc", {
    do: async (ctx: any) => {
        ctx.session.remark = null
        await deleteMenuFromContext(ctx)
        let message = "You have *not* claimed this treasure.\n\n" +
            "I have saved it for you and you can still claim it within the next *30 days*.\n\n" +
            "To claim it, simply click on _'🎁 My treasures'_ in the Finder menu."
        ctx.replyWithMarkdown(
            message,
            Markup.keyboard(await getKeyboard(ctx)).resize()
        )
        return false
    },
    joinLastRow: true,
})

const claimNftMiddleware = new MenuMiddleware('nft/', claimNft)

export {
    claimNftMiddleware
}
