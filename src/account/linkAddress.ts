import { botParams, getKeyboard } from "../../config.js";
import { amountToHuman } from "../../tools/utils.js";
import User, { IUser } from "../models/user.js";
import { CustomContext } from "../../types/CustomContext.js";

export const linkAddress = async (ctx: CustomContext): Promise<void> => {
  const user: IUser = await User.findOne({ chatId: ctx.chat.id });
  if (!user.wallet || user.wallet.linked) {
    const message = "You have already linked you account.";
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
  await user.wallet.setPassword();
  await user.save();
  const { value, tokenString } = amountToHuman(user.wallet.password,
    parseInt(botParams.settings.network.decimals) - parseInt(botParams.settings.pwordDigitsToAdd));
  const message = "Please make a *transfer* of exactly \n\n`" + value + "` " + tokenString +
    ` (This amount was randomly generated and thus acts as a *password* to ensure you ` +
    `are the rightful owner of the wallet. Do NOT share this amount with anyone!)` +
    "\n\n*FROM* the address you registered:" +
    `*\n\n${user.wallet.address}\n\n*` +
    "*TO* this address: \n\n`" + botParams.account.address + "`\n\n" +
    "As soon as a transfer comes in, I will credit your account.\n\n" +
    "Please note that the password expires in 15 minutes! After which you will have to generate " +
    "a new one by clicking on '🔗 Link address' in the menu again." +
    `\n\nThe purpose of this transfer is to link your wallet with your account ` +
    `and allow for safe deposits and withdrawals in the future.`;
  await ctx.reply(message, {
    reply_markup: {
      keyboard: (await getKeyboard(ctx)).build(),
      resize_keyboard: true
    },
    parse_mode: "Markdown",
  });
};