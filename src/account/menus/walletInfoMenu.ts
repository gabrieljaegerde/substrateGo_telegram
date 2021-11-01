import { MenuTemplate, MenuMiddleware, deleteMenuFromContext } from "grammy-inline-menu";
import { botParams } from "../../../config.js";
import { amountToHumanString } from "../../../tools/utils.js";
import User, { IUser } from "../../models/user.js";
import { IWallet } from "../../models/wallet.js";
import { linkAddress } from "../linkAddress.js";
import { CustomContext } from "../../../types/CustomContext.js";
import { encodeAddress } from "@polkadot/util-crypto";

const walletInfo = new MenuTemplate<CustomContext>(async (ctx) => {
  const session = await ctx.session;
  const user: IUser = await User.findOne({ chatId: ctx.chat.id });
  const userWallet: IWallet = user.wallet;
  session.wallet = userWallet;
  if (!userWallet) {
    return `Please first add a ${botParams.settings.network.name} wallet to your account ` +
      `by clicking on 'Add Address' in the menu below.`;
  }
  const balanceString = amountToHumanString(user.getBalance());
  let text = `*Address:* _${userWallet.address}_\n\n*Account Balance:* _${balanceString}_`;
  const shortAddr = userWallet.address.substring(0, 3) +
    "..." +
    userWallet.address.substring(userWallet.address.length - 3);
  if (userWallet.linked) {
    text += "\n\n\u2705 The wallet with address " + shortAddr + " is currently linked to this account. You can " +
      `now go ahead and make a transfer from it to the deposit address of this bot: ` +
      "\n\n`" + encodeAddress(botParams.account.address, botParams.settings.network.prefix) + "`\n\nYour transfer amount " +
      `will then be automatically credited to your balance.`;
  }
  else {
    text += "\n\n\u274C The wallet with address " + shortAddr + " is *NOT* linked to this account! " +
      "Please link the wallet ASAP!!!\n\n" +
      `_Do NOT transfer to the deposit address BEFORE having linked your wallet. Or you may loose ` +
      `your funds._`;
  }
  return { text, parse_mode: 'Markdown' };
});

walletInfo.interact("🔗 Link address", "la", {
  do: async (ctx: CustomContext) => {
    linkAddress(ctx);
    await deleteMenuFromContext(ctx);
    return false;
  },
  joinLastRow: true,
  hide: async (ctx: CustomContext) => {
    const session = await ctx.session;
    if (!session.wallet || session.wallet.linked) {
      return true;
    }
    return false;
  }
});

export const walletInfoMiddleware = new MenuMiddleware('win/', walletInfo);
