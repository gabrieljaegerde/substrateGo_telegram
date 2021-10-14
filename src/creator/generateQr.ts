import { botParams, getKeyboard } from "../../config.js";
import crypto from "crypto";
import QRCode from "qrcode";
import { decorateQr } from "../../tools/utils.js";
import Qr, { IQr } from "../models/qr.js";
import { InputFile } from "grammy";
import { CustomContext } from "../../types/CustomContext.js";

export const generateQr = async (ctx: CustomContext): Promise<void> => {
    try {
        let id;
        let qr: IQr;
        do {
            id = crypto.randomBytes(parseInt(botParams.settings.codeLength)).toString("hex");
            qr = await Qr.findOne({ code: id });
        } while (qr);
        const codeLink = `https://t.me/${botParams.settings.botUsername}?start=` + id;
        const url = await QRCode.toDataURL(codeLink);
        const qrImage = await decorateQr(Buffer.from(url.split(',')[1], 'base64'));
        const message = "Go ahead and *print* this sticker now.\n\n_Once you have placed it somewhere, " +
            "click on_ *'🗞️ Create treasure 🗞️'* _again " +
            "and move on to_ *Step 2: 'Add Treasure'*_, to link it to a location._";
        //save qr in db
        await new Qr({
            code: id,
            creator: ctx.chat.id
        }).save();
        await ctx.replyWithPhoto(new InputFile(qrImage));
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
    } catch (err) {
        console.error(err);
    }
};
