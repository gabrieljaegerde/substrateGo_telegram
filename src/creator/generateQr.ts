import { botParams, getKeyboard } from "../../config.js";
import crypto from "crypto";
import QRCode from "qrcode";
import { decorateQr } from "../../tools/utils.js";
import { CustomContext } from "../../types/CustomContext.js";
import Treasure, { ITreasure } from "../models/treasure.js";

export const generateQr = async (): Promise<{ qrImage: Buffer, code: string; }> => {
    try {
        let code;
        let treasure: ITreasure;
        do {
            code = crypto.randomBytes(parseInt(botParams.settings.codeLength) / 2).toString("hex");
            treasure = await Treasure.findOne({ code });
        } while (treasure);
        const codeLink = `https://t.me/${botParams.settings.botUsername}?start=` + code;
        const url = await QRCode.toDataURL(codeLink);
        const qrImage: Buffer = await decorateQr(Buffer.from(url.split(',')[1], 'base64'), code);
        return { qrImage, code };
    } catch (err) {
        console.error(err);
    }
};
