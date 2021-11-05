import { StatelessQuestion } from "@grammyjs/stateless-question";
import { getKeyboard } from "../../config.js";
import { listCreatedMiddleware } from "./menus/listCreatedMenu.js";
import Treasure, { ITreasure } from "../models/treasure.js";
import { CustomContext } from "../../types/CustomContext.js";
import Location from "../models/location.js";

export const editLocation = new StatelessQuestion("elt", async (ctx: CustomContext) => {
    const session = await ctx.session;
    let message = "";
    if (ctx.message.location) {
        const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id });
        const newLocation = new Location({
            latitude: ctx.message.location.latitude.toString(),
            longitude: ctx.message.location.longitude.toString()
        });
        treasure.location = newLocation;
        await treasure.save();
        message = "Location updated";
    }
    else if (ctx.message.text === "delete") {
        const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id });
        treasure.location = null;
        await treasure.save();
        message = "Location deleted. This treasure is no longer findable through our maps.";
    }
    else {
        message = "I was not able to edit the location. Please try sending me a location message again. (or 'delete')";
        return editLocation.replyWithMarkdown(ctx, message);
    }

    await ctx.reply(message, {
        reply_markup: {
            keyboard: (await getKeyboard(ctx)).build(),
            resize_keyboard: true
        },
    });
    listCreatedMiddleware.replyToContext(ctx, `lc/i:${session.treasureId}/`);
});
