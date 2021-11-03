import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "grammy-inline-menu";
import { botParams, getKeyboard } from "../../../config.js";
import { getTransactionCost, getTransactionCostSingle, mintAndSend, mintNft, sendNft } from "../../network/accountHandler.js";
import { Collection, NFT } from "rmrk-tools";
import { amountToHumanString, bigNumberArithmetic, bigNumberComparison } from "../../../tools/utils.js";
import Treasure, { ITreasure } from "../../models/treasure.js";
import Reward, { IReward } from "../../models/reward.js";
import User, { IUser } from "../../models/user.js";
import fetch, { Response } from "node-fetch";
import { encodeAddress } from "@polkadot/util-crypto";
import { pinSingleMetadataWithoutFile, unpin } from "../../../tools/pinataUtils.js";
import { InlineKeyboard, InputFile } from "grammy";
import { CustomContext } from "../../../types/CustomContext.js";
import { INftProps } from "../../../types/NftProps.js";
import { u8aToHex } from "@polkadot/util";
import { postCollectionMiddleware } from "./postCollectionMenu.js";

const generateSendRemark = async (collectionId: string,
    instance: string,
    sn: string,
    userWallet: string) => {
    const lastHeader = await botParams.api.rpc.chain.getHeader();
    return `RMRK::SEND::1.0.0::${lastHeader.number}-${collectionId}-` +
        `${instance}-${sn}::${userWallet}`;
};

const claimNft = new MenuTemplate<CustomContext>(async (ctx) => {
    const session = await ctx.session;
    session.hideClaimButtons = false;

    const loadMessage = await botParams.bot.api.sendMessage(ctx.chat.id, "Loading...");
    const treasure: ITreasure = session.treasure;
    if (!treasure) {
        session.hideClaimButtons = true;
        console.error("no session.treasure");
        return "an error occurred...";
    }
    const reward: IReward = await Reward.findOne({ finder: ctx.chat.id, treasureId: treasure._id });
    const user: IUser = await User.findOne({ chatId: ctx.chat.id });
    const collectionId = Collection.generateId(
        u8aToHex(botParams.account.publicKey),
        botParams.settings.collectionSymbol
    );
    //const mintRemarkPlaceholder = "RMRK::MINTNFT::1.0.0::%7B%22collection%22%3A%22d43593c715a56da27d-HEYHYE%22%2C%22name%22%3A%22Yea%22%2C%22instance%22%3A%22616c37d59e45e3ea3bd51741%22%2C%22transferable%22%3A1%2C%22sn%22%3A%2261815fcf37e9a9e6eada6452%22%2C%22metadata%22%3A%22ipfs%3A%2F%2Fipfs%2Fbafkreiakkgfso7jp4ewgtj6whrtp4nijbamiodicl3ygi5k4vta2p6ntby%22%7D";
    const sendRemarkPlaceholder = await generateSendRemark(collectionId, treasure._id, reward._id, user.wallet.address);
    const nftProps: INftProps = {
        block: 0,
        collection: collectionId,
        name: treasure.name,
        instance: treasure._id,
        transferable: 1,
        sn: reward._id,
        metadata: botParams.settings.cidPlaceholder, //use this as a placeholder. actual metadata different
    };
    const nft = new NFT(nftProps.block,
        nftProps.collection,
        nftProps.name,
        nftProps.instance,
        nftProps.transferable,
        nftProps.sn,
        nftProps.metadata);
    session.nft = nftProps;
    const mintRemark = nft.mintnft();
    const mintInfo = await getTransactionCostSingle(
        "nft",
        null,
        null,
        mintRemark
    );
    const sendRemark = sendRemarkPlaceholder;
    const sendInfo = await getTransactionCostSingle(
        "nft",
        null,
        null,
        sendRemark
    );
    const networkCost = bigNumberArithmetic(mintInfo.partialFee.toString(), sendInfo.partialFee.toString(), "+");
    const totalCost = bigNumberArithmetic(networkCost, botParams.settings.creatorReward, "+");
    botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id);
    const userBalance = user.getBalance();
    const creator = await treasure.getCreator();
    let message = `You are about to collect...\nTreasure: *${treasure.name}*\n` +
        `Creator: *${creator._id}*\n\n` +
        `Receiving the NFT in your wallet will incur an approximate total ` +
        `*fee* of _${amountToHumanString(totalCost)}_\n\n` +
        `*Network fee (approx.):* _${amountToHumanString(networkCost)}_\n*Creator Reward:* _${amountToHumanString(botParams.settings.creatorReward)}_`;

    if (bigNumberComparison(totalCost, userBalance, ">")) {
        await ctx.reply(
            message,
            {
                reply_markup: {
                    keyboard: (await getKeyboard(ctx)).build(),
                    resize_keyboard: true
                },
                parse_mode: "Markdown",
            }
        );
        session.hideClaimButtons = true;
        const reply = `This fee exceeds your current balance of _${amountToHumanString(userBalance)}_. Please top up your account ` +
            `by going to the main menu and clicking on _'Account Settings'_.\n\n` +
            `_I have saved this treasure for you and you can still claim it within the next 30 days. ` +
            `To claim it, simply click on '🛍️ My treasures' in the Finder menu._`;
        return { text: reply, parse_mode: 'Markdown' };
    }
    message += `\n\nDo you wish to proceed?`;
    return { text: message, parse_mode: 'Markdown' };
});

claimNft.interact("Proceed", "sp", {
    do: async (ctx: CustomContext) => {
        const session = await ctx.session;
        const loadMessage = await botParams.bot.api.sendMessage(ctx.chat.id, "Loading...");
        const user: IUser = await User.findOne({ chatId: ctx.chat.id });
        const treasure: ITreasure = session.treasure;
        const reward: IReward = await Reward.findOne({ finder: user.chatId, treasureId: treasure._id });
        let creator: IUser = await User.findOne({ chatId: treasure.creator });
        try {
            const nftDescription = `This is a KusamaGo treasure!\n${treasure.description}\n\n`+
                `Treasure ID: ${treasure._id}\n\nCreator: ${creator._id}\n\n` +
                `Creator Wallet: ${creator.wallet && creator.wallet.address ? creator.wallet.address : ""}\n\n` +
                `Location: {lat: ${treasure.location.latitude}, lng: ${treasure.location.longitude}}\n\n` +
                `Hint: ${treasure.hint}\n\n` +
                `Reward ID: ${reward._id}\n\n` +
                `Join the community: ${botParams.settings.telegramGroupLink}\n\n` +
                `Join the hunt: https://t.me/${botParams.settings.botUsername}`;
            const metadataCid = await pinSingleMetadataWithoutFile(treasure.file, `Reward:${reward._id}`, {
                name: `KusamaGo: ${treasure.name}`,
                description: nftDescription,
                external_url: botParams.settings.externalUrl
            });
            if (metadataCid === "") {
                console.error("empty metadataCid");
                throw Error;
            }
            session.nft.metadata = metadataCid;

            let nft = new NFT(session.nft.block,
                session.nft.collection,
                session.nft.name,
                session.nft.instance,
                session.nft.transferable,
                session.nft.sn,
                session.nft.metadata);
            const mintRemark = nft.mintnft();
            let { block: mintBlock, success: mintSuccess, hash, fee: mintFee, topupRequired: mintTopupRequired } = await mintNft(mintRemark, user);
            if (mintSuccess) {
                //find user and decrease balance
                const totalCost = bigNumberArithmetic(mintFee, botParams.settings.creatorReward, "+");
                user.subtractFromBalance(totalCost);
                await user.save();

                nft = new NFT(mintBlock,
                    session.nft.collection,
                    session.nft.name,
                    session.nft.instance,
                    session.nft.transferable,
                    session.nft.sn,
                    session.nft.metadata);

                const sendRemark = nft.send(user.wallet.address);
                let { block: sendBlock, success: sendSuccess, hash: sendHash, fee: sendFee, topupRequired: sendTopupRequired } = await sendNft(sendRemark, user);
                if (sendSuccess) {
                    //find user and decrease balance
                    const totalCost = sendFee;
                    user.subtractFromBalance(totalCost);
                    await user.save();

                    //add creator-reward ($) to creator balance
                    //need to fetch creator again in case user = creator. otherwise user.save() overwritten
                    if (user._id.toString() === creator._id.toString())
                        creator = await User.findOne({ chatId: treasure.creator });
                    creator.addReward();
                    await creator.save();

                    //set finder-reward (NFT) as collected
                    reward.setCollected(sendHash, sendBlock, metadataCid);
                    //save all db changes
                    await reward.save();

                    await deleteMenuFromContext(ctx);

                    //send message to creator
                    await botParams.bot.api
                        .sendMessage(creator.chatId, `Treasure '${treasure.name}' was just collected.\n\n` +
                            `${amountToHumanString(botParams.settings.creatorReward)} credited to your account.`);
                    await botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id);
                    //send message to finder
                    const successMessage = "Success. The NFT has been minted and sent to your wallet.";
                    await ctx.reply(successMessage, {
                        reply_markup: {
                            keyboard: (await getKeyboard(ctx)).build(),
                            resize_keyboard: true
                        },
                        parse_mode: "Markdown",
                    });
                    session.reward = reward;
                    await postCollectionMiddleware.replyToContext(ctx);
                    return false;
                }
                //if cannot cover transaction cost
                else if (sendTopupRequired) {
                    const message = "You do not have enough funds to pay for the send transaction.\n\n" +
                        "Please top up your balance by going to the main menu and " +
                        "clicking on _'Account Settings'_.\n\n" +
                        "_I have saved this treasure for you and you can still claim it within the next 30 days. " +
                        "To claim it, simply click on '🛍️ My treasures' in the Finder menu._";
                    botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id);
                    await deleteMenuFromContext(ctx);
                    await ctx.reply(message, {
                        reply_markup: {
                            keyboard: (await getKeyboard(ctx)).build(),
                            resize_keyboard: true
                        },
                        parse_mode: "Markdown",
                    });
                    return false;
                }
            }
            //if cannot cover transaction cost
            else if (mintTopupRequired) {
                await unpin(metadataCid);
                const message = "You do not have enough funds to pay for this transaction.\n\n" +
                    "Please top up your balance by going to the main menu and " +
                    "clicking on _'Account Settings'_.\n\n" +
                    "_I have saved this treasure for you and you can still claim it within the next 30 days. " +
                    "To claim it, simply click on '🛍️ My treasures' in the Finder menu._";
                botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id);
                await deleteMenuFromContext(ctx);
                await ctx.reply(message, {
                    reply_markup: {
                        keyboard: (await getKeyboard(ctx)).build(),
                        resize_keyboard: true
                    },
                    parse_mode: "Markdown",
                });
                return false;
            }
            //if error: response = null
            else {
                await unpin(metadataCid);
                botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id);
                const message = "A problem occured while collecting your NFT. Please try again";
                await ctx.reply(message, {
                    reply_markup: {
                        keyboard: (await getKeyboard(ctx)).build(),
                        resize_keyboard: true
                    },
                });
                return false;
            }
        } catch (error) {
            console.error(error);
        }
        session.code = null;
        return false;
    },
    hide: async (ctx) => {
        const session = await ctx.session;
        return session.hideClaimButtons;
    },
    joinLastRow: true,
});

claimNft.interact("Cancel", "sc", {
    do: async (ctx: CustomContext) => {
        const session = await ctx.session;
        session.collectStep = "";
        await deleteMenuFromContext(ctx);
        const message = "You have *not* claimed this treasure.\n\n" +
            "I have saved it for you and you can still claim it within the next *30 days*.\n\n" +
            "To claim it, simply click on _'🛍️ My treasures'_ in the Finder menu.";
        await ctx.reply(
            message,
            {
                reply_markup: {
                    keyboard: (await getKeyboard(ctx)).build(),
                    resize_keyboard: true
                },
                parse_mode: "Markdown",
            }
        );
        return false;
    },
    hide: async (ctx) => {
        const session = await ctx.session;
        return session.hideClaimButtons;
    },
    joinLastRow: true,
});

export const claimNftMiddleware = new MenuMiddleware('nft/', claimNft);
