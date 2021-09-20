export interface IUser {
    first_name: string,
    username: string,
    chatid: number,
    type: "private" | "group",
    totalRewardBalance: string,
    rewardBalance: string,
    wallet: IWallet,
    oldWallets: Array<IWallet>,
    blocked: boolean,
    timestamp: string
}

export interface INftProps {
    block: number,
    collection: string,
    symbol: string,
    transferable: 0 | 1,
    sn: string,
    metadata: string
}

export interface IWallet {
    address: string,
    balance: string,
    timestamp: string,
    linked: boolean,
    password: string,
    expiry: string
}

export interface IGetTransactionCost {
    type: string,
    recipient: string,
    toSendAmount?: string,
    toSendRemarks?: Array<string>
}
