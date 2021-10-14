# Telegram NFT Treasure Hunt Bot

A bot to create and find NFT treasures on substrate networks.

Requirements:
create an account on the Kusama chain.
create a pinata account and api key.
create a mongo db database (with e.g. atlas)
create a collection

npm install

create a .env file in the root directory with the following variables filled in
REMARK_STORAGE_DB_FILE_PATH="db/remarkStorage.json"
BOT_TOKEN="YOUR BOT TOKEN HERE"
WS_NODE_URI="wss://kusama-rpc.polkadot.io/"
MNEMONIC="YOUR KUSAMA ACCOUNTS MNEMONIC HERE"
PINATA_API="YOUR PINATA API KEY HERE"
PINATA_SECRET="YOUR PINATA SECRET HERE"
MONGO_URI="YOUR MONGO URI HERE"
COLLECTION_ID="YOUR COLLECTION ID HERE"
COLLECTION_SYMBOL="YOUR COLLECTION SYMBOL HERE"
CID_PLACEHOLDER="ipfs://ipfs/bafkreghiwzsxn1d3t5fm3ejqak476lhuqp5ka3u6shyqosj5umrc3gk14i"
DEFAULT_FILE="bafkreifzao62rzi25uro4eyu7csr4v46pwi7ixslgra7wjol6l57v3oyea"

make the appropriate changes to settings.ts

tsc

node dist/index.js
