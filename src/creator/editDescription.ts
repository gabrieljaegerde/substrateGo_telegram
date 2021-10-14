import { StatelessQuestion } from "@grammyjs/stateless-question";
import { getKeyboard } from "../../config.js";
import { listCreatedMiddleware } from "./menus/listCreatedMenu.js";
import Treasure, { ITreasure } from "../models/treasure.js";
import { CustomContext } from "../../types/CustomContext.js";

const editDescription = new StatelessQuestion("ec", async (ctx: CustomContext) => {
    let message = "";
    const session = await ctx.session;
    if (ctx.message.text) {
        const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id });
        treasure.description = ctx.message.text;
        await treasure.save();
        message = "Description updated";
    }
    else {
        message = "I was not able to add that description. Please try sending me a text message again.";
        return editDescription.replyWithMarkdown(ctx, message);
    }
    await ctx.reply(message, {
        reply_markup: {
            keyboard: (await getKeyboard(ctx)).build(),
            resize_keyboard: true
        },
    });
    listCreatedMiddleware.replyToContext(ctx, `lc/i:${session.treasureId}/`);
});

export {
    editDescription
};

