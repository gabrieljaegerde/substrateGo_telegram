import { MenuTemplate, createBackMainMenuButtons, MenuMiddleware } from "grammy-inline-menu";
import { editDescription } from "../editDescription.js";
import { editNameTreasure } from "../editNameTreasure.js";
import { editFile } from "../editFile.js";
import { renderInfo } from "./showCreatedItemMenu.js";
import { editHint } from "../editHint.js";
import { CustomContext } from "../../../types/CustomContext.js";

export const editTreasure = new MenuTemplate(async (ctx: CustomContext) => {
    const session = await ctx.session;
    const text = await renderInfo(ctx.chat.id, session.treasureId);
    return { text, parse_mode: "Markdown" };
});

editTreasure.interact("🔥 Edit name", "en", {
    do: async (ctx: CustomContext) => {
        //await deleteMenuFromContext(ctx)
        const message = `Please send me the new name.`;
        editNameTreasure.replyWithMarkdown(ctx, message);
        return true;
    },
    joinLastRow: true
});

editTreasure.interact("✨ Edit Description", "ed", {
    do: async (ctx: CustomContext) => {
        //await deleteMenuFromContext(ctx)
        const message = `The description is only visible to users that have collected this treasure. ` +
        `Its content is included in the NFT collected by them.\n\n` +
        `Please send me the new description.`;
        editDescription.replyWithMarkdown(ctx, message);
        return true;
    },
    joinLastRow: true
});

editTreasure.interact("🌈 Edit NFT File", "enf", {
    do: async (ctx: CustomContext) => {
        //await deleteMenuFromContext(ctx)
        const message = `By editing the file associated with this treasure, you will change the NFT ` +
            `collected by all future finders. Users that have already collected this treasure (and thus already have its NFT) are ` +
            `unaffected.\n\n_⚠️Any file uploaded will be stored on the blockchain ` +
            `and_ *CANNOT* _be removed. Please ensure you don't upload any private ` +
            `files._⚠️\n\nPlease send me the new NFT file.`;
        editFile.replyWithMarkdown(ctx, message);
        return true;
    },
    joinLastRow: false
});

editTreasure.interact("🤷 Edit Hint", "eh", {
    do: async (ctx: CustomContext) => {
        //await deleteMenuFromContext(ctx)
        const message = `The hint is visible to all treasure finders. Its purpose is to help users ` +
            `find your treasure.\n\nPlease send me the new hint message.`;
        editHint.replyWithMarkdown(ctx, message);
        return true;
    },
    joinLastRow: true
});

editTreasure.manualRow(createBackMainMenuButtons());

export const editTreasureMiddleware = new MenuMiddleware('etr/', editTreasure);