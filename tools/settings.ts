function getExtrinsicLinks(network, txHash) {
  const links = [];
  links.push([
    ["subscan", `https://${network.toLowerCase()}.subscan.io/extrinsic/${txHash}`]
    // ,
    // [
    //   "polkascan",
    //   `https://polkascan.io/${network.toLowerCase()}/transaction/${block}-${index}`,
    // ],
  ]);
  return links;
}

function getExtrinsicLinksBlock(network, index, block) {
  const links = [];
  links.push([
    ["subscan", `https://${network.toLowerCase()}.subscan.io/extrinsic/${block}-${index}`]
    // ,
    // [
    //   "polkascan",
    //   `https://polkascan.io/${network.toLowerCase()}/transaction/${block}-${index}`,
    // ],
  ]);
  return links;
}

export const getSettings = () => {
  const settings = {
    network: {
      name: "Kusama",
      prefix: process.env.NETWORK_PREFIX,
      decimals: "12",
      token: "KSM",
    },
    getExtrinsicLinks: getExtrinsicLinks,
    getExtrinsicLinksBlock: getExtrinsicLinksBlock,
    botToken: process.env.BOT_TOKEN,
    botUsername: process.env.BOT_USERNAME,
    codeLength: 40,
    pwordLower: 10000, //0.001wmd
    pwordUpper: 11000, //0.0011wmd
    pwordDigitsToAdd: "5",
    creatorReward: "100000000", //0.0001ksm
    //upload a default file to pinata manually first, then paste the cid here
    defaultFile: process.env.DEFAULT_FILE.toString(),
    //only the length has to match. actual content irrelevant
    cidPlaceholder: process.env.CID_PLACEHOLDER.toString(),
    collectionSymbol: process.env.COLLECTION_SYMBOL.toString(),
    collectionName: process.env.COLLECTION_NAME.toString(),
    //wallet may have an initial balance, to cover collection creation fees for example.
    walletStartFunds: process.env.START_FUNDS.toString(),
    //create a user account to deposit all non-transferrable funds to that are unassigned
    //assign a chat id that is impossible to exist on telegram.
    charityChatId: 100000000000000,
    adminChatId: parseInt(process.env.ADMIN_CHATID),
    telegramGroupLink: "https://t.me/kusamaGo",
    defaultHint: "If you look hard enough, you will find it.",
    defaultDescription: "This is a treasure from the global NFT treasure hunt game. Join us: t.me/kusamaGo",
    externalUrl: "https://substrateGo.com/kusama"
  };
  return settings;
};
