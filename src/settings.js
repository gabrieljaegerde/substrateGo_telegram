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

function getExtrinsicLinks(network, index, block) {
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
    keyboard: {
      addqr: "Add new QR Code",
      genqr: "Generate QR Code",
      stats: "View Stats",
      col: "Add/edit collection(s)",
      hunter: "Switch to hunter mode",
      scanqr: "Scan QR Code",
      find: "Find prey",
      addadr: "Add/edit address",
      addbal: "View balance",
      hunted: "Switch to hunted mode",
    },
    botToken: process.env.BOT_TOKEN,
    botUsername: "polkadotGo_bot",
    codeLength: 20,
    pwordLower: 100000000000, //0.1wmd
    pwordUpper: 110000000000,
    depositAddress: process.env.DEPOSIT_ADDRESS.toString(),
    callback: (data, isExtrinsic) => {},
  }
  return settings
}
