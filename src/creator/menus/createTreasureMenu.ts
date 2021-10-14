import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "grammy-inline-menu";
import { generateQr } from "../generateQr.js";
import { cancelSetupInlineKeyboard } from "../../../config.js";
import { CustomContext } from "../../../types/CustomContext.js";

const createTreasure = new MenuTemplate(async (ctx: CustomContext) => {
    const session = await ctx.session;
    session.treasure = null;
    const info = "Creating a Treasure involves 3 steps." +
        "\n\nStep 1: *Generate* a *QR* Code for your treasure by clicking on 'Generate QR'" +
        "\n\nStep 2: *Print* out the generated *QR* Code" +
        "\n\nStep 3: Once you know where you want to place your treasure, *add* it to the world treasure map by clicking on 'Add Treasure'";
    return { text: info, parse_mode: "Markdown" };
});

createTreasure.interact("1. Generate QR", "gq", {
    do: async (ctx: CustomContext) => {
        await deleteMenuFromContext(ctx);
        generateQr(ctx);
        return false;
    },
    joinLastRow: true
});

createTreasure.interact("2. Add Treasure", "at", {
    do: async (ctx: CustomContext) => {
        const session = await ctx.session;
        await deleteMenuFromContext(ctx);
        session.treasure = null;
        const progressMessage = "_Setup Progress:_\n\n*1. Send QR* -> 2. Location -> 3. Name";
        await ctx.reply(
            progressMessage,
            {
                reply_markup: { remove_keyboard: true },
                parse_mode: "Markdown",
            }
        );
        const message = `Please send me a picture of the QR Code you wish to add.`;
        await ctx.reply(message, {
            reply_markup: cancelSetupInlineKeyboard, parse_mode: "Markdown"
        });
        session.createStep = "code";
        return false;
    },
    joinLastRow: true
});

const createTreasureMiddleware = new MenuMiddleware('ct/', createTreasure);

export {
    createTreasureMiddleware
};
