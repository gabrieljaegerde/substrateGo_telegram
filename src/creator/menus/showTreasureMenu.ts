import { MenuTemplate, createBackMainMenuButtons, deleteMenuFromContext, MenuMiddleware } from "grammy-inline-menu";
import { InputFile } from "grammy";
import { botParams, getKeyboard } from "../../../config.js";
import { listCreatedMiddleware } from "./listCreatedMenu.js";
import QRCode from "qrcode";
import fetch from 'node-fetch';
import { decorateQr } from "../../../tools/utils.js";
import Treasure, { ITreasure } from "../../models/treasure.js";
import { renderInfo } from "./showCreatedItemMenu.js";
import { CustomContext } from "../../../types/CustomContext.js";

export const showTreasure = new MenuTemplate<CustomContext>(async (ctx) => {
    const session = await ctx.session;
    const text = await renderInfo(ctx.chat.id, session.treasureId);
    return { text, parse_mode: "Markdown" };
});

showTreasure.interact("🌈 Show NFT File", "sn", {
    do: async (ctx: CustomContext) => {
        const session = await ctx.session;
        await deleteMenuFromContext(ctx);
        const loadMessage = await botParams.bot.api.sendMessage(ctx.chat.id, "Loading...");
        const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id });
        await botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id);
        const message = `Treasure ${treasure.name}'s NFT:`;
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
        //await ctx.replyWithPhoto(`https://ipfs.io/ipfs/${treasure.file}`);
        //directly loading image times out inside replyWithPhoto
        const image = await fetch(`https://ipfs.io/ipfs/${treasure.file}`);
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await ctx.replyWithPhoto(new InputFile(buffer));
        listCreatedMiddleware.replyToContext(ctx, `lc/i:${session.treasureId}/`);
        return false;
    },
    joinLastRow: false
});

showTreasure.interact("🏙️ Show QR", "sq", {
    do: async (ctx: CustomContext) => {
        const session = await ctx.session;
        const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id });
        await deleteMenuFromContext(ctx);
        if (treasure) {
            const code = `https://t.me/${botParams.settings.botUsername}?start=` + treasure.code;
            const url = await QRCode.toDataURL(code);
            const qrImage = await decorateQr(Buffer.from(url.split(',')[1], 'base64'), treasure.code);
            const message = `Treasure ${treasure.name}'s QR Code:`;
            await ctx.reply(message, {
                reply_markup: {
                    keyboard: (await getKeyboard(ctx)).build(),
                    resize_keyboard: true
                },
            });
            await ctx.replyWithPhoto(new InputFile(qrImage));
        }
        listCreatedMiddleware.replyToContext(ctx, `lc/i:${session.treasureId}/`);
        return false;
    },
    joinLastRow: true
});

showTreasure.interact("🌍 Show location", "eP", {
    do: async (ctx: CustomContext) => {
        const session = await ctx.session;
        await deleteMenuFromContext(ctx);
        const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id });
        const message = `Treasure ${treasure.name}'s location:`;
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
        await botParams.bot.api.sendLocation(ctx.chat.id, treasure.location.latitude, treasure.location.longitude);
        listCreatedMiddleware.replyToContext(ctx, `lc/i:${session.treasureId}/`);
        return false;
    },
    joinLastRow: false
});

showTreasure.manualRow(createBackMainMenuButtons());

export const showTreasureMiddleware = new MenuMiddleware('str/', showTreasure);