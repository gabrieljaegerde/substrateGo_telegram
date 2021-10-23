import { Composer } from "grammy";
import { CustomContext } from "../../types/CustomContext.js";
import { botParams, getKeyboard } from "../../config.js";
import { enterAddress } from "../account/enterAddress.js";
import { withdrawBalanceMiddleware } from "../account/menus/withdrawBalanceMenu.js";
import { enterWithdrawAmount } from "../account/enterWithdrawAmount.js";
import { walletInfoMiddleware } from "../account/menus/walletInfoMenu.js";
import { linkAddress } from "../account/linkAddress.js";
//import prom from "./metrics.js"
import User, { IUser } from "../models/user.js";
import { resetSession, amountToHumanString, amountToHuman } from "../../tools/utils.js";

export const accountComposer = new Composer<CustomContext>();

/*
 *   React bot on 'Account Settings' message
 */

const regex = new RegExp(/.*Account Settings.*/i);
accountComposer.hears(regex, async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
        await resetSession(ctx);
        const session = await ctx.session;
        session.menu = "account";
        const message = "Welcome to your 🛠️ Account Settings. Let me give you some quick info.";
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
        walletInfoMiddleware.replyToContext(ctx);
    }
});

/*
 *   React bot on 'Edit address' message
 */

accountComposer.hears("📪 Edit address", async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
        await resetSession(ctx);
        const user: IUser = await User.findOne({ chatId: ctx.chat.id });
        const replyMsg = `Current Address:\n_${user.wallet.address}_\n\n` +
            `Enter new ${botParams.settings.network.name} address:`;
        enterAddress.replyWithMarkdown(ctx, replyMsg);
    }
});

/*
 *   React bot on 'Add address' message
 */

accountComposer.hears("📪 Add address", async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
        const user: IUser = await User.findOne({ chatId: ctx.chat.id });
        if (user.wallet) {
            const message = "You already have a wallet. Please refresh the menu -> /menu <-.";
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
        else {
            const message = "Please enter your wallet address with which you wish to top up " +
                "your account (to pay for minting and transaction fees).\n\n_Your NFTs will " +
                "also be sent to this address._\n\n*Each address can only be linked to " +
                "1 telegram account at a time!*";
            enterAddress.replyWithMarkdown(ctx, message);
        }
        return;
    }
});

/*
 *   React bot on 'Withdraw' message
 */

accountComposer.hears("🧾 Withdraw", async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
        await resetSession(ctx);
        const user: IUser = await User.findOne({ chatId: ctx.chat.id });
        const { value, tokenString } = amountToHuman(user.getBalance(), 12);
        const replyMsg = "Your balance:\n`" + value + "` " + tokenString + "\n\nHow much would you " +
            `like to withdraw?\n\n_Please use '.' notation instead of commas. e.g. 0.02 or 0.5 or 1.4 etc._`;
        enterWithdrawAmount.replyWithMarkdown(ctx, replyMsg);
    }
});

/*
 *   React bot on '🔗 Link address' message
 */

accountComposer.hears("🔗 Link address", async (ctx: CustomContext) => {
    if (ctx.chat.type == "private") {
        await resetSession(ctx);
        linkAddress(ctx);
    }
});

accountComposer.use(walletInfoMiddleware);

accountComposer.use(withdrawBalanceMiddleware);

accountComposer.use(enterAddress.middleware());

accountComposer.use(enterWithdrawAmount.middleware());
