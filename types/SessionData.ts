//import prom from "./metrics.js"
import { ITreasure } from "../src/models/treasure.js"
import { IReward } from "../src/models/reward.js"
import { IWallet } from "../src/models/wallet.js";
import { INftProps } from "./NftProps.js";

export interface SessionData {
    nonCollectedRewardsPage: number | PromiseLike<number>;
    collectedRewardsPage: number | PromiseLike<number>;
    menu: string;
    treasureLocation: boolean;
    treasure: ITreasure;
    guideStep: number;
    guideMessageChatId: number;
    guideMessageMessageId: number;
    editMode: boolean;
    showMode: boolean;
    userCollectedRewards: Array<IReward>;
    reward: IReward;
    userCreated: Array<ITreasure>;
    treasureId: string;
    withdrawAmount: string;
    hideWithdrawButtons: boolean;
    createdPage: number;
    remark: string;
    userNonCollectedRewards: Array<IReward>;
    treasureToClaim: string;
    code: string;
    nft: INftProps;
    hideClaimButtons: boolean;
    createStep: string;
    wallet: IWallet
  }