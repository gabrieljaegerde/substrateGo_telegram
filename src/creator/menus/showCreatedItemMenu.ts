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
        info += `\n_Status_: *\u2705 (Treasure shown publicly)*`;
    }
    else {
        info += `\n_Status_: *\uD83D\uDEAB (Treasure NOT shown publicly)*`;
    }
    info += `\n_Description (seen by treasure collectors)_: *${treasure.description}*`;
    info += `\n_Hint (seen by everyone)_: *${treasure.hint}*\n\n`;
    const allRewards: IReward[] = await Reward.find({ treasureId: treasureId, collected: true });
    if (allRewards.length > 0) {
        info += `_Treasure has been collected_ *${allRewards.length}* _time(s)._`;
    }
    else {
        info += `_This treasure has not been collected yet._`;
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

showCreatedItem.submenu("Show Treasure Details", "std", showTreasure);

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

