import { MenuTemplate, createBackMainMenuButtons, MenuMiddleware } from "grammy-inline-menu";
import { editTreasure } from "./editTreasureMenu.js";
import { showTreasure } from "./showTreasureMenu.js";
import Treasure, { ITreasure } from "../../models/treasure.js";
import Reward, { IReward } from "../../models/reward.js";
import { CustomContext } from "../../../types/CustomContext.js";

export const renderInfo = async (chatId: number, treasureId: string): Promise<string> => {
    const treasure: ITreasure = await Treasure.findOne({ _id: treasureId, creator: chatId });
    let info = treasure.name ? `\n_Name_: *${treasure.name}*` : "";
    info += `\n_Created on_: *${treasure.createdAt.toDateString()}*`;
    if (treasure.active) {
        info += `\n_Status_: *\u2705 (shown publicly, collectable)*`;
    }
    else {
        info += `\n_Status_: *\uD83D\uDEAB (not shown publicly, non-collectable)*`;
    }
    info += `\n_Hint_: *${treasure.hint}*`;
    info += `\n_Description_: *${treasure.description}*\n`;
    const noCollected = await treasure.howManyCollected();
    if (treasure.visible && noCollected > 0) {
        info += `\n*🙉 NFT File is openly viewable* _(Change this in 'Edit treasure')_\n`;
    }
    else if (treasure.visible && noCollected === 0 ) {
        info += `\n*🙉 NFT File is openly viewable* _(⚠️ We recommend you change this in 'Edit treasure' since your ` + 
        `treasure has not been collected yet. This is to prevent people stealing your art.)_\n`;
    }
    else {
        info += `\n*🙈 NFT File is only viewable to users that collected this treasure* ` +
            `_(change this in 'Edit treasure')_\n`;
    }
    
    if (noCollected > 0) {
        info += `\n_This treasure has been collected_ *${noCollected}* _time(s)._`;
    }
    else {
        info += `\n_This treasure has not been collected yet._`;
    }
    return info;
};

export const showCreatedItem = new MenuTemplate<CustomContext>(async (ctx) => {
    const session = await ctx.session;
    const treasureId = ctx.match[1];
    session.treasureId = treasureId;
    const text = await renderInfo(ctx.chat.id, treasureId);
    return { text, parse_mode: "Markdown" };
});

showCreatedItem.submenu("Edit Treasure", "et", editTreasure);

showCreatedItem.submenu("View Treasure Details", "vtd", showTreasure);

showCreatedItem.toggle(async (ctx) => {
    const session = await ctx.session;
    const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id });
    return treasure.active ? "Activated" : "Deactivated";
},
    'x',
    {
        set: async (ctx, choice) => {
            const treasureId = ctx.match[1];
            const treasure: ITreasure = await Treasure.findOne({ _id: treasureId, creator: ctx.chat.id });
            treasure.active = choice;
            await treasure.save();
            return true;
        },
        isSet: async (ctx) => {
            const treasureId = ctx.match[1];
            const treasure: ITreasure = await Treasure.findOne({ _id: treasureId, creator: ctx.chat.id });
            return treasure.active === true;
        }
    });

showCreatedItem.manualRow(createBackMainMenuButtons());

export const showCreatedItemMiddleware = new MenuMiddleware('scri/', showCreatedItem);

