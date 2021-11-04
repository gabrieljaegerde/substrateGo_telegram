import { Composer } from "grammy";
import { CustomContext } from "../../types/CustomContext.js";
import { botParams, getKeyboard } from "../../config.js";
//import prom from "./metrics.js"
import User, { IUser } from "../models/user.js";
import Treasure, { ITreasure } from "../models/treasure.js";
import { resetSession, amountToHumanString } from "../../tools/utils.js";
import { listCreatedMiddleware } from "../creator/menus/listCreatedMenu.js";
import { createTreasureMiddleware } from "../creator/menus/createTreasureMenu.js";
import { editNameTreasure } from "../creator/editNameTreasure.js";
import { editHint } from "../creator/editHint.js";
import { editDescription } from "../creator/editDescription.js";
import { editFile } from "../creator/editFile.js";
import { editTreasureMiddleware } from "../creator/menus/editTreasureMenu.js";
import { showTreasureMiddleware } from "../creator/menus/showTreasureMenu.js";
import { showCreatedItemMiddleware } from "../creator/menus/showCreatedItemMenu.js";
import { editLocation } from "../creator/editLocation.js";

export const creatorComposer = new Composer<CustomContext>();

/*
 *   React bot on 'View stats' message
 */

creatorComposer.hears("🚦 View stats", async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
        await resetSession(ctx);
        const loadMessage = await botParams.bot.api.sendMessage(ctx.chat.id, "Loading...");
        const user: IUser = await User.findOne({ chatId: ctx.chat.id });
        const userTreasures: ITreasure[] = await Treasure.find({ creator: ctx.chat.id }).sort({ createdAt: "desc" });
        let message = "";
        let collectedCount = 0;
        if (userTreasures.length > 0) {
            const treasureMessages = await Promise.all(userTreasures.map(async (treasure: ITreasure): Promise<string> => {
                const timesCollected = await treasure.howManyCollected();
                let light: string;
                if (timesCollected > 5)
                    light = "🟢";
                else if (timesCollected >= 1)
                    light = "🟡";
                else
                    light = "🔴";
                collectedCount += timesCollected;
                return `${light} _${treasure.name}_: ${timesCollected}\n`;
            }));
            message = `Your ${userTreasures.length} treasures have already been collected ${collectedCount} times.\n\n`;
            message += `Total Rewards earned: ${amountToHumanString(user.totalRewardBalance)}\n\n` +
                "*Times collected:*\n";
            message += treasureMessages.join('');
        }
        else {
            message = `You do not have any treasures yet. Go and create some today!`;
        }
        botParams.bot.api.deleteMessage(loadMessage.chat.id, loadMessage.message_id);
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
        return;
    }
});

/*
 *   React bot on 'Create treasure' message
 */

creatorComposer.hears("🗞️ Create treasure 🗞️", async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
        await resetSession(ctx);
        createTreasureMiddleware.replyToContext(ctx);
    }
});

/*
 *   React bot on 'Edit treasures' message
 */

creatorComposer.hears("✏️ Edit treasures", async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
        await resetSession(ctx);
        listCreatedMiddleware.replyToContext(ctx);
    }
});

/*
 *   React bot on 'Creator Mode' message
 */

creatorComposer.hears("🧙🏻‍♀️ Creator Mode", async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
        await resetSession(ctx);
        const session = await ctx.session;
        session.menu = "creator";
        const message = "You have entered 🧙🏻‍♀️ *creator* mode.\n\nHere you can:\n• *create* new treasures🗞️\n" +
            "• *edit* treasures✏️\n" +
            "• and *track* their performance🚦.\n\n_Each time a user collects your treasures, you receive a " +
            `small reward (${amountToHumanString(botParams.settings.creatorReward)}). The NFT treasure ` +
            `sent to the finders is customizable by you. Go create awesome treasures and earn!_\n\n` +
            `Join ${botParams.settings.telegramGroupLink} to meet other treasure creators!`;
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
});

creatorComposer.use(createTreasureMiddleware);

creatorComposer.use(editDescription.middleware());

creatorComposer.use(editNameTreasure.middleware());

creatorComposer.use(editHint.middleware());

creatorComposer.use(editFile.middleware());

creatorComposer.use(editLocation.middleware());

creatorComposer.use(listCreatedMiddleware);

creatorComposer.use(editTreasureMiddleware);

creatorComposer.use(showTreasureMiddleware);

creatorComposer.use(showCreatedItemMiddleware);