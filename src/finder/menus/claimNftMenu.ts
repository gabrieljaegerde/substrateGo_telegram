import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "grammy-inline-menu";
import { botParams, getKeyboard } from "../../../config.js";
import { getTransactionCost, mintAndSend } from "../../network/accountHandler.js";
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

const claimNft = new MenuTemplate(async (ctx: CustomContext) => {
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
    const nftProps: INftProps = {
        block: 0,
        sn: reward._id,
        owner: encodeAddress(botParams.account.address, botParams.settings.network.prefix),
        transferable: 1,
        metadata: botParams.settings.cidPlaceholder, //use this as a placeholder. actual metadata different
        collection: collectionId,
        symbol: treasure.name,
    };
    const nft = new NFT(nftProps);
    session.nft = nftProps;
    const remarks: string[] = [];
    remarks.push(nft.mint());
    const info = await getTransactionCost(
        "nft",
        user.wallet.address,
        null,
        remarks
    );
    botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id);
    const userBalance = user.getBalance();
    const creator = await treasure.getCreator();
    if (bigNumberComparison(info.partialFee.toString(), userBalance, ">")) {
        const message = `You are about to collect:\nTreasure: *${treasure.name}*\n` +
            `Creator: *${creator._id}*\n\n` +
            `Receiving the NFT in your wallet will incur an approximate total ` +
            `*fee* of _${amountToHumanString(bigNumberArithmetic(info.partialFee.toString(), botParams.settings.creatorReward, "+"))}_\n\n` +
            `*Network fee (approx.):* _${amountToHumanString(info.partialFee.toString())}_\n*Creator Reward:* _${amountToHumanString(botParams.settings.creatorReward)}_\n\n`;
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
    const reply = `Receiving the NFT in your wallet will incur an approximate total ` +
        `*fee* of _${amountToHumanString(bigNumberArithmetic(info.partialFee.toString(), botParams.settings.creatorReward, "+"))}_\n\n` +
        `*Network fee (approx.):* _${amountToHumanString(info.partialFee.toString())}_\n*Creator Reward:* _${amountToHumanString(botParams.settings.creatorReward)}_\n\n` +
        `Do you wish to proceed?`;

    return { text: reply, parse_mode: 'Markdown' };
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
            const metadataCid = await pinSingleMetadataWithoutFile(treasure.file, `Reward:${reward._id}`, {
                description: treasure.description,
                external_url: botParams.settings.externalUrl,
                properties: {
                    rarity: {
                        type: "string",
                        value: "common",
                    },
                    creator: {
                        type: "string",
                        value: creator._id
                    },
                    creator_wallet: {
                        type: "string",
                        value: creator.wallet && creator.wallet.address ? creator.wallet.address : ""
                    },
                    location: {
                        type: "string",
                        value: `{lat: ${treasure.location.latitude}, lng: ${treasure.location.longitude}}`
                    },
                    hint: {
                        type: "string",
                        value: treasure.hint
                    },
                    description: {
                        type: "string",
                        value: treasure.description
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
            });
            if (metadataCid === "") {
                console.error("empty metadataCid");
                throw Error;
            }
            session.nft.metadata = metadataCid;

            const remarks: string[] = [];
            const nft = new NFT(session.nft);
            remarks.push(nft.mint(user.wallet.address));

            const { block, success, hash, fee, topupRequired } = await mintAndSend(remarks, user);
            if (success) {
                //find user and decrease balance
                const totalCost = bigNumberArithmetic(fee, botParams.settings.creatorReward, "+");
                user.subtractFromBalance(totalCost);
                await user.save();

                //add creator-reward ($) to creator balance
                //need to fetch creator again in case user = creator. otherwise user.save() overwritten
                if (user._id.toString() === creator._id.toString())
                    creator = await User.findOne({ chatId: treasure.creator });
                creator.addReward();
                await creator.save();

                //set finder-reward (NFT) as collected
                reward.setCollected(hash, block, metadataCid);
                //save all db changes
                await reward.save();


                await deleteMenuFromContext(ctx);

                //send message to creator
                await botParams.bot.api
                    .sendMessage(creator.chatId, `Treasure '${treasure.name}' was just collected.\n\n` +
                        `${amountToHumanString(botParams.settings.creatorReward)} credited to your account.`);
                //send message to finder
                const successMessage = "Success. The NFT has been minted and sent to your wallet.\n" +
                    `You can find it in 'My treasures' under the name: ${reward.name}`;
                const inlineKeyboard = new InlineKeyboard();
                botParams.settings
                    .getExtrinsicLinks(
                        botParams.settings.network.name,
                        hash
                    )
                    .map(row => {
                        return row.map(link => {
                            return inlineKeyboard.url(link[0], link[1]);
                        });
                    });
                await botParams.bot.api
                    .sendMessage(ctx.chat.id, successMessage, { reply_markup: inlineKeyboard, parse_mode: "Markdown" });
                await botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id);
                const loadNFTMessage = await botParams.bot.api.sendMessage(ctx.chat.id, "Loading NFT...");
                const response: Response = await fetch(reward.file.replace('ipfs://', 'https://ipfs.io/'));
                const json: any = await response.json();
                const message = `Treasure '${treasure.name}' NFT:`;
                await ctx.reply(message, {
                    reply_markup: {
                        keyboard: (await getKeyboard(ctx)).build(),
                        resize_keyboard: true
                    },
                    parse_mode: "Markdown",
                });
                const image_link = json.image.replace('ipfs://', 'https://ipfs.io/');
                //directly loading image times out inside replyWithPhoto
                const image = await fetch(image_link);
                const arrayBuffer = await image.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                await ctx.replyWithPhoto(new InputFile(buffer));
                await botParams.bot.api.deleteMessage(loadNFTMessage.chat.id, loadNFTMessage.message_id);
                //await ctx.replyWithPhoto(json.image.replace('ipfs://', 'https://ipfs.io/'));
                return false;
            }
            //if cannot cover transaction cost
            else if (topupRequired) {
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
