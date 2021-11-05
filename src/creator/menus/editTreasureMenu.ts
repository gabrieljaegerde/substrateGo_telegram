import { MenuTemplate, createBackMainMenuButtons, MenuMiddleware } from "grammy-inline-menu";
import { editDescription } from "../editDescription.js";
import { editNameTreasure } from "../editNameTreasure.js";
import { editFile } from "../editFile.js";
import { renderInfo } from "./showCreatedItemMenu.js";
import { editHint } from "../editHint.js";
import { CustomContext } from "../../../types/CustomContext.js";
import Treasure, { ITreasure } from "../../models/treasure.js";
import { editLocation } from "../editLocation.js";

export const editTreasure = new MenuTemplate<CustomContext>(async (ctx) => {
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

editTreasure.interact("🤷 Edit Hint", "eh", {
    do: async (ctx: CustomContext) => {
        //await deleteMenuFromContext(ctx)
        const message = `The hint is visible to everyone. Its purpose is to help users ` +
            `find your treasure.\n\nPlease send me the new hint message.`;
        editHint.replyWithMarkdown(ctx, message);
        return true;
    },
    hide: async (ctx) => {
        const session = await ctx.session;
        const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id });
        if (treasure.location)
            return false;
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

editTreasure.interact("✨ Edit Description", "ed", {
    do: async (ctx: CustomContext) => {
        //await deleteMenuFromContext(ctx)
        const message = `The description is included in the NFT collected by treasure finders.\n\n` +
            `Please send me the new description.`;
        editDescription.replyWithMarkdown(ctx, message);
        return true;
    },
    joinLastRow: true
});

editTreasure.interact(async (ctx) => {
    const session = await ctx.session;
    const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id });
    return treasure.location ? `📍 Edit Location` : `📍 Add Location`;
}, "el", {
    do: async (ctx: CustomContext) => {
        //await deleteMenuFromContext(ctx)
        const session = await ctx.session;
        const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id });
        let message = `Please send me the treasure's location.`;
        if (treasure.location) {
            message = `Please send me the new location.\n\n_Send me a message with the text "delete" ` +
                `if you would like to delete this treasure's location and remove it from our maps._`;
        }
        editLocation.replyWithMarkdown(ctx, message);
        return true;
    },
    joinLastRow: false
});

editTreasure.toggle(async (ctx) => {
    const session = await ctx.session;
    const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id });
    return treasure.visible ? "File shown" : "File hidden";
},
    'y',
    {
        set: async (ctx, choice) => {
            const treasureId = ctx.match[1];
            const treasure: ITreasure = await Treasure.findOne({ _id: treasureId, creator: ctx.chat.id });
            treasure.visible = choice;
            await treasure.save();
            return true;
        },
        isSet: async (ctx) => {
            const treasureId = ctx.match[1];
            const treasure: ITreasure = await Treasure.findOne({ _id: treasureId, creator: ctx.chat.id });
            return treasure.visible === true;
        },
        joinLastRow: true,
        hide: async (ctx) => {
            const treasureId = ctx.match[1];
            const treasure: ITreasure = await Treasure.findOne({ _id: treasureId, creator: ctx.chat.id });
            if (treasure.location)
                return false;
            return true;
        }
    });

editTreasure.manualRow(createBackMainMenuButtons());

export const editTreasureMiddleware = new MenuMiddleware('etr/', editTreasure);