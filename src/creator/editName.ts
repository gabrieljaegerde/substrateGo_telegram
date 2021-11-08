import { StatelessQuestion } from "@grammyjs/stateless-question";
import { getKeyboard } from "../../config.js";
import { listCreatedMiddleware } from "./menus/listCreatedMenu.js";
import Treasure, { ITreasure } from "../models/treasure.js";
import { CustomContext } from "../../types/CustomContext.js";

const editName = new StatelessQuestion("ent", async (ctx: CustomContext) => {
    const session = await ctx.session;
    let message = "";
    if (ctx.message.text) {
        const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id });
        treasure.name = ctx.message.text;
        await treasure.save();
        message = "Name updated";
    }
    else {
        message = "I was not able to edit the name. Please try sending me a text message again.";
        return editName.replyWithMarkdown(ctx, message);
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
    editName
};