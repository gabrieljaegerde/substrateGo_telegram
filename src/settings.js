function getEventLinks(network, index, block) {
  var links = []
  links.push([
    ["subscan", `https://${network.toLowerCase()}.subscan.io/extrinsic/${block}-${index}`],
    [
      "polkascan",
      `https://polkascan.io/${network.toLowerCase()}/transaction/${block}-${index}`,
    ],
  ])
  return links
}

function getExtrinsicLinks(network, txHash) {
  var links = []
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
      name: "Westend",
      prefix: "42",
      decimals: "12",
      token: "WND",
    },
    startMsg:
      "Created by Gabriel Jaeger.\n\n",
    validatorsMessage:
      'To tip me:\n\nThank you!',
    getEventLinks: getEventLinks,
    getExtrinsicLinks: getExtrinsicLinks,
    getExtrinsicLinksBlock: getExtrinsicLinksBlock,
    keyboard: {
      addqr: "Add new QR Code",
      genqr: "Generate QR Code",
      stats: "View Stats",
      col: "Add/edit collection(s)",
      scanqr: "Scan QR Code",
      find: "Find prey",
      addadr: "Add/edit address",
      addbal: "View balance",
    },
    botToken: process.env.BOT_TOKEN,
    botUsername: "polkadotGo_bot",
    codeLength: 20,
    pwordLower: 100000000000, //0.1wmd
    pwordUpper: 110000000000,
    defaultNft: "QmaQCd7pS56AbgbdA8eqZQZqRwhWD8cjDUbAdni9UQ8yEA",
    collectionId: "8e9e74b9d29b92c328-GONOW1",
    depositAddress: process.env.DEPOSIT_ADDRESS.toString(),
    callback: (data, isExtrinsic) => {},
  }
  return settings
}
