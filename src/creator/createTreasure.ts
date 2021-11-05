import { StatelessQuestion } from "@grammyjs/stateless-question";
import { getKeyboard, botParams } from "../../config.js";
import { listCreatedMiddleware } from "./menus/listCreatedMenu.js";
import Treasure, { ITreasure } from "../models/treasure.js";
import { CustomContext } from "../../types/CustomContext.js";
import { generateQr } from "./generateQr.js";
import { InputFile } from "grammy";

export const createTreasure = new StatelessQuestion("ct", async (ctx: CustomContext) => {
    let message = "";
    if (ctx.message.text) {
        const { qrImage, code } = await generateQr();
        const newTreasure: ITreasure = new Treasure({
            name: ctx.message.text,
            code: code,
            location: null,
            creator: ctx.chat.id,
            active: true,
            hint: botParams.settings.defaultHint,
            description: botParams.settings.defaultDescription,
            file: botParams.settings.defaultFile,
            visible: false,
        });
        await newTreasure.save();
        message = "This is the QR Code for your new treasure. Scanning it will mint an NFT.\n\n" +
            "The treasure is a *blueprint* for the NFTs to be minted from it. Before you share the QR, " +
            "we strongly encourage you to edit the treasure. This customizes the NFTs that will be minted when " +
            "this treasure is collected.\n\n_If you would like to place this treasure in the physical world and " +
            "make it findable by other users, " +
            "then please print the QR Code and set a location for the treasure in the Edit treasure menu._";
        await ctx.replyWithPhoto(new InputFile(qrImage));
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
    }
    else {
        message = "That name was invalid. Please try sending me a text message with the name again.";
        return createTreasure.replyWithMarkdown(ctx, message);
    }
});
