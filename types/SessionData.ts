//import prom from "./metrics.js"
import { ITreasure } from "../src/models/treasure.js";
import { IReward } from "../src/models/reward.js";
import { IWallet } from "../src/models/wallet.js";
import { INftProps } from "./NftProps.js";

export interface SessionData {
  collectStep: string;
  nonCollectedRewardsPage: number | PromiseLike<number>;
  collectedRewardsPage: number | PromiseLike<number>;
  menu: string;
  treasureLocation: boolean;
  treasure: ITreasure;
  userCollectedRewards: IReward[];
  reward: IReward;
  userCreated: ITreasure[];
  treasureId: string;
  withdrawAmount: string;
  hideWithdrawButtons: boolean;
  createdPage: number;
  userNonCollectedRewards: IReward[];
  treasureToClaim: string;
  code: string;
  nft: INftProps;
  hideClaimButtons: boolean;
  createStep: string;
  wallet: IWallet;
}