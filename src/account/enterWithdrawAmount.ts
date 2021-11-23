import { botParams, getKeyboard } from "../../config.js";
import { amountToHumanString, bigNumberArithmetic, bigNumberComparison } from "../../tools/utils.js";
import { StatelessQuestion } from "@grammyjs/stateless-question";
import User, { IUser } from "../models/user.js";
import { withdrawBalanceMiddleware } from "./menus/withdrawBalanceMenu.js";
import { CustomContext } from "../../types/CustomContext.js";

export const enterWithdrawAmount = new StatelessQuestion("amt", async (ctx: CustomContext) => {
    const session = await ctx.session;
    const decimals = parseInt(botParams.settings.network.decimals);
    const regex = new RegExp("^[0-9]*\\.{0,1}[0-9]{0," + decimals + "}$");
    if (!regex.test(ctx.message.text)) {
        const message = `The amount you entered did *not* meet the formatting ` +
            `requirements.\n\n` +
            `_Please enter an amount again. Only digits and '.' are permitted._`;
        return enterWithdrawAmount.replyWithMarkdown(ctx, message);
    }
    const withdrawAmount = bigNumberArithmetic(ctx.message.text, ("1e" + decimals), "*");
    session.withdrawAmount = withdrawAmount;
    const user: IUser = await User.findOne({ chatId: ctx.chat.id });
    if (!user.wallet) {
        const message = "Please add an address to your account first by clicking on 'Add address'\n. " +
            "This is the address your withdrawal will be sent to.\n\n_While it is not " +
            "required to link your account to the address for a withdrawal, it is still " +
            "good practice to do so for you to ensure that you have entered the correct address._";
        await ctx.reply(message, {
            reply_markup: {
                keyboard: (await getKeyboard(ctx)).build(),
                resize_keyboard: true
            },
        });
        return;
    }
    const userBalance: string = user.getBalance();
    console.log(`${new Date()} withdrawAmount ${withdrawAmount}`);
    console.log(`userBalance ${userBalance}`);
    if (!user.withdrawalAllowed(withdrawAmount, userBalance)) {
        const message = `The amount you entered (${amountToHumanString(withdrawAmount)}) is bigger ` +
            `than your balance of _${amountToHumanString(userBalance)}_.\n\n` +
            `Please enter an amount *less than* or *equal* to your balance.`;
        return enterWithdrawAmount.replyWithMarkdown(ctx, message);
    }
    if (bigNumberComparison(withdrawAmount, "0", "<")) {
        const message = "The amount *has* to be a *positive* number. Please enter an amount *greater* than *0*.";
        return enterWithdrawAmount.replyWithMarkdown(ctx, message);
    }
    withdrawBalanceMiddleware.replyToContext(ctx);
});