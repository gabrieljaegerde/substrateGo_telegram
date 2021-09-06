import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../config.js"
import { Markup } from "telegraf"
import _ from "lodash"
import jsQR from "jsqr"
import { getTransactionCost, mintAndSend } from "../network/accountHandler.js"
import { NFT } from 'rmrk-tools';
import { amountToHumanString } from "../wallet/helpers.js"

const claimNft = new MenuTemplate(async ctx => {
    ctx.session.remarks = null
    var loadMessage = await botParams.bot.telegram
        .sendMessage(ctx.chat.id, "Loading...")
    /*
    var loadMessage = await botParams.bot.telegram
                .sendMessage(ctx.chat.id, "Loading...")
    )*/

    let treasure = botParams.db.chain.get("treasures").find({ id: ctx.session.qrId }).value()
    let nftProps = {
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
    let remarks = []
    remarks.push(nft.mint(ctx.session.user.wallet.address))

    ctx.session.remarks = remarks

    let info = await getTransactionCost("nft", ctx.session.user.wallet.address, remarks)
    botParams.bot.telegram.deleteMessage(loadMessage.chat.id, loadMessage.message_id)
    let reply = `Receiving the NFT in your wallet will incur a ` +
        `fee of ${amountToHumanString(info.partialFee)}. Do you wish to proceed?`
    //format to human
    return reply
})

claimNft.interact("Proceed", "sp", {
    do: async ctx => {
        /*
        if (!ctx.session.wallet || ctx.session.wallet.balance === 0){
          return "/"
        }*/
        var loadMessage = await botParams.bot.telegram
            .sendMessage(ctx.chat.id, "Loading...")
        /*
        let nftProps = {
            "block": 0,
            "collection": botParams.settings.collectionId,
            "symbol": "string",
            "transferable": 1,
            "sn": new Date().getTime().toString(),
            "metadata": `https://ipfs.io/ipfs/{}`
        }
        const nft = new NFT(
            nftProps
        )
        let remarks = []
        remarks.push(nft.mint(ctx.session.user.wallet.address))*/
        //let sendRemark = `rmrk::SEND::2.0.0::${nft.id}::${ctx.session.user.wallet.address}`
        //remarks.push(sendRemark)
        var { success, response, fee } = await mintAndSend(ctx.session.remarks, ctx.session.user)
        if (success) {
            botParams.db.read()
            botParams.db.chain = _.chain(botParams.db.data)
            //find user and decrease balance
            let user = botParams.db.chain.get("users").find({ chatid: ctx.chat.id }).value()
            user.wallet.balance -= fee
            //check if scanned has an entry
            botParams.db.chain.get("scanned")
                .find({ finder: ctx.session.user.chatid, qrId: ctx.session.qrId })
                .assign({ collected: true, timestampCollected: new Date(), txHash: response }).value()
            botParams.db.write()
            let treasure = botParams.db.chain.get("treasures").find({ id: ctx.session.qrId }).value()
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
            // await ctx.replyWithMarkdown(
            //     ,
            //     Markup.keyboard(getKeyboard(ctx)).resize()
            // )
            if (treasure.nft != botParams.settings.defaultNft) {
                var loadMessage = await botParams.bot.telegram
                    .sendMessage(ctx.chat.id, "Loading...")

                let treasureDb = botParams.db.chain.get("treasures").find({ id: ctx.session.scannedDb.qrId }).value()

                var response = await fetch(`http://ipfs.io/ipfs/${treasureDb.nft}`)
                let buffer = await response.buffer()
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
                "Please top up your balance by going into your account settings and " +
                "clicking on 'Account Settings'. " +
                "I have saved this treasure for you and you can still claim it within the next 30 days. " +
                "To claim it, simply click on '\uD83C\uDF81 My treasures' in the Finder menu."
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
            //await deleteMenuFromContext(ctx)
            return false//"withdraw/"
            //show a certain menu
        }
    },
    joinLastRow: true,
    hide: ctx => {
        return false
    },
})

claimNft.interact("Cancel", "sc", {
    do: async ctx => {
        /*
        if (!ctx.session.wallet || ctx.session.wallet.balance === 0){
          return "/"
        }*/
        //await deleteMenuFromContext(ctx)

        //editWalletMiddleware.replyToContext(ctx)
        ctx.session.remark = null
        await deleteMenuFromContext(ctx)
        let message = "You have NOT claimed this treasure. " +
            "But I have saved it for you and you can still claim it within the next 30 days. " +
            "To claim it, simply click on '\uD83C\uDF81 My treasures' in the Finder menu."
        ctx.replyWithMarkdown(
            message,
            Markup.keyboard(getKeyboard(ctx)).resize()
        )
        return false
    },
    joinLastRow: true,
    hide: ctx => {
        return false
    },
})

const claimNftMiddleware = new MenuMiddleware('nft/', claimNft)

export {
    claimNftMiddleware
}
