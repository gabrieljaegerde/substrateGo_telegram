function getExtrinsicLinks(network, txHash) {
  const links = []
  links.push([
    ["subscan", `https://${network.toLowerCase()}.subscan.io/extrinsic/${txHash}`]
    // ,
    // [
    //   "polkascan",
    //   `https://polkascan.io/${network.toLowerCase()}/transaction/${block}-${index}`,
    // ],
  ])
  return links
}

function getExtrinsicLinksBlock(network, index, block) {
  var links = []
  links.push([
    ["subscan", `https://${network.toLowerCase()}.subscan.io/extrinsic/${block}-${index}`]
    // ,
    // [
    //   "polkascan",
    //   `https://polkascan.io/${network.toLowerCase()}/transaction/${block}-${index}`,
    // ],
  ])
  return links
}

export const getSettings = () => {
  const settings = {
    network: {
      name: "Kusama",
      prefix: "0",
      decimals: "12",
      token: "KSM",
    },
    getExtrinsicLinks: getExtrinsicLinks,
    getExtrinsicLinksBlock: getExtrinsicLinksBlock,
    botToken: process.env.BOT_TOKEN,
    botUsername: "kusamaGo_bot",
    
    codeLength: 20,
    pwordLower: 10000, //0.001wmd
    pwordUpper: 11000, //0.0011wmd
    pwordDigitsToAdd: "5",
    creatorReward: "100000000", //0.0001ksm
    //upload a default file to pinata manually first, then paste the cid here
    defaultFile: process.env.DEFAULT_FILE.toString(),
    //only the length has to match. actual content irrelevant
    cidPlaceholder: process.env.CID_PLACEHOLDER.toString(),
    collectionSymbol: process.env.COLLECTION_SYMBOL.toString(),
    collectionId: process.env.COLLECTION_ID.toString(),
    //wallet may have an initial balance, to cover collection creation fees for example.
    walletStartFunds: "99205842522",
    //create a user account to deposit all non-transferrable funds to that are unassigned
    //assign a chat id that is impossible to exist on telegram.
    charityChatId: 100000000000000,
    adminChatId: 523582952,
    telegramGroupLink: "t.me/kusamaGo",
    defaultHint: "If you look hard enough, you will find it.",
    defaultDescription: "This a treasure from the global NFT treasure hunt game. Join us: t.me/kusamaGo"
  }
  return settings
}
