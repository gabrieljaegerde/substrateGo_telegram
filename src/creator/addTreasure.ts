import { Router } from '@grammyjs/router';
import type { CustomContext } from '../../types/CustomContext';
import { botParams, cancelSetupInlineKeyboard, getKeyboard, locationKeyboard } from "../../config.js";
import { scan } from "../../tools/utils.js";
//import prom from "./metrics.js"
import Treasure, { ITreasure } from "../models/treasure.js";
import Qr from "../models/qr.js";
import Location from "../models/location.js";

export const prepareSetup = async (ctx: CustomContext, code: string):
    Promise<{ treasure: ITreasure, createStep: string; }> => {
    const treasureExists: boolean = await Treasure.exists({ code: code });
    const qrExists: boolean = await Qr.exists({ code: code });
    if (!treasureExists && qrExists) {
        const newTreasure: ITreasure = new Treasure({
            name: "",
            code: code,
            location: null,
            creator: ctx.chat.id,
            active: true,
            hint: botParams.settings.defaultHint,
            description: botParams.settings.defaultDescription,
            file: botParams.settings.defaultFile
        });
        const progressMessage = "_Setup Progress:_\n\n1. QR✔️ -> *2. Send Location* -> 3. Name";

        await ctx.reply(
            progressMessage,
            {
                reply_markup: {
                    keyboard: locationKeyboard.build(),
                    resize_keyboard: true,
                },
                parse_mode: "Markdown",
            }
        );
        const message = "Send me the location of the treasure by pressing the button below " +
            "(you might have to click on the 4 squared icon next to the paper clip to see it).\n\n" +
            "This *cannot* " +
            "be changed later so make sure you only set it once the treasure is " +
            "placed in its final location.\n\n" +
            "_Tip: If you are not currently at the treasure's location, then turn off your " +
            "phones GPS now in order to be able to set the location manually._";
        await ctx.reply(
            message,
            {
                reply_markup: cancelSetupInlineKeyboard,
                parse_mode: "Markdown"
            }
        );
        //cannot directly update session in helper function -> return required vars
        return { treasure: newTreasure, createStep: "location" };
    }
    else if (treasureExists) {
        const message = "A treasure with this QR Code is already registered.";
        await ctx.reply(message, {
            reply_markup: {
                keyboard: (await getKeyboard(ctx)).build(),
                resize_keyboard: true
            },
        });
        return { treasure: null, createStep: "" };
    }
    else {
        const message = "Only QR Codes generated by this bot can be added. " +
            "_Click on _*'Create Treasure'*_ and then _*'Generate QR Code'*_ in the menu below if you did not generate one yet._\n\n" +
            "It is also possible that I just didn't read the QR code in the picture properly.\n" +
            "If you think that is the case, then *please* send me a *new picture* of it.";
        await ctx.reply(message, {
            reply_markup: cancelSetupInlineKeyboard, parse_mode: "Markdown"
        });
        return { treasure: null, createStep: "code" };
    }
};

export const router = new Router<CustomContext>(async (ctx: CustomContext) => {
    const session = await ctx.session;
    return session.createStep;
});

router.route("code", async (ctx: CustomContext) => {
    const session = await ctx.session;
    if (ctx.message && ctx.message.photo) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileId = photo.file_id;
        const file = await ctx.getFile(fileId);
        const url = file.getUrl();
        const result = await scan(url);
        if (result instanceof Error || result === "Couldn't find enough alignment patterns" || result === "Error") {
            const message = "An error occured when scanning the QR Code. Please send me a new photo (" +
                "it helps to crop the image so that only the QR Code is shown).\n\n" +
                "_Should this error persist, you can also scan the QR Code with any QR Code reader and " +
                "simply click on the link decrypted by the reader (and then the start button in the bot) " +
                "to set up this treasure._";
            await ctx.reply(message, {
                reply_markup: cancelSetupInlineKeyboard, parse_mode: "Markdown"
            });
            return;
        }
        const code = result.replace(`https://t.me/${botParams.settings.botUsername}?start=`, "");
        const { treasure, createStep } = await prepareSetup(ctx, code);
        session.treasure = treasure;
        session.createStep = createStep;
        return;
    }
    else {
        const message = `What you sent me is not a photo. I can only scan photos for QR codes.\n\nPlease send me a single photo (not file).`;
        session.treasure = null;
        await ctx.reply(message, {
            reply_markup: cancelSetupInlineKeyboard, parse_mode: "Markdown"
        });
        return;
    }
});

router.route("location", async (ctx: CustomContext) => {
    const session = await ctx.session;
    if (ctx.message.location) {
        session.treasure.location = new Location({
            latitude: ctx.message.location.latitude.toString(),
            longitude: ctx.message.location.longitude.toString()
        });
        const progressMessage = "_Setup Progress:_\n\n1. QR✔️ -> 2. Location✔️ -> *3. Send Name*";
        await ctx.reply(
            progressMessage,
            {
                reply_markup: { remove_keyboard: true },
                parse_mode: "Markdown",
            }
        );
        const message = `To make it easier for you and others to identify ` +
            `this treasure, please now give it a descriptive name.`;
        await ctx.reply(message, {
            reply_markup: cancelSetupInlineKeyboard, parse_mode: "Markdown"
        });
        session.createStep = "name";
        return;
    }
    else {
        const message = "Send me the location of the treasure by pressing the button below " +
            "(you might have to click on the 4 squared icon next to the paper clip to see it).\n\n" +
            "This *cannot* " +
            "be changed later so make sure you only set it once the treasure is " +
            "placed in its final location.\n\n" +
            "_Tip: If you are not currently at the treasure's location, then turn off your " +
            "phones GPS now in order to be able to set the location manually._";
        await ctx.reply(message, {
            reply_markup: cancelSetupInlineKeyboard, parse_mode: "Markdown"
        });
    }
});

router.route("name", async (ctx: CustomContext) => {
    const session = await ctx.session;
    if (ctx.message.text) {
        session.treasure.name = ctx.message.text;
        const treasureUpload: ITreasure = new Treasure(session.treasure);
        await treasureUpload.save();
        session.treasure = null;
        session.createStep = "";
        const message = "This treasure has been successfully added with the BASIC settings.\n\n" +
            "You can always go and spice up your treasures by hitting 'Edit treasure' in the creator menu!";
        await ctx.reply(message, {
            reply_markup: {
                keyboard: (await getKeyboard(ctx)).build(),
                resize_keyboard: true
            },
        });
    }
    else {
        const message = "The name you sent me was invalid. " +
            "Please try again. Just send me a text message with the name in it please.";
        await ctx.reply(message, {
            reply_markup: cancelSetupInlineKeyboard, parse_mode: "Markdown"
        });
        return;
    }
});
