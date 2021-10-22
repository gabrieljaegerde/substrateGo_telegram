# KusamaGo Telegram Bot

KusamaGo is a global NFT treasure hunt game. 
With this bot users can easily *create* and *collect* treasures.

Try it -> [kusamaGo](t.me/kusamaGo_bot)
## Game Play

KusamaGo is like geo-caching with NFT rewards.

Users can take on roles of Creator and Finder interchangibly.

![Main Menu](./assets/mainMenu.jpg?raw=true)

In creator mode users can create and edit treasures as well as track their progress. By editing a treasure, the creator can customize the NFT that users will receive when collecting the respective treasure.

![Creator Menu](./assets/creatorMenu.jpg?raw=true)

In the finder mode users have tools to find treasures near them. Treasures can easily be collected and collected treasures viewed. Collected treasures exist as NFTs on the Kusama blockchain.

![Finder Menu](./assets/finderMenu.jpg?raw=true)

Albeit low (a few USD cents), transactions on the Kusama chain incur a network cost. This cost is incurred when an NFT gets minted (at treasure collection) and to be paid by the collector. A user is therefore required to connect their account to their wallet before being able to collect treasures. The NFTs (for the treasures collected) will also be sent to that wallet. Any account related tasks can easily be take care of in the Account Settings

![Account Settings](./assets/accountSettings.jpg?raw=true)

## Join us
[Telegram Group](t.me/kusamaGo)

## Future Projects
1. Create a website with a world map of all the treasures.
2. Create a dApp.

This project is open-source and your contributions more than welcome!!!

## Installation
##### Setting up a node
While there are other alternatives, we recommend running a local dev [Kusama node](https://guide.kusama.network/docs/maintain-sync/)

##### Create a pinata account
Head on over to [Pinata](https://www.pinata.cloud/) to generate and API key.

##### Creating a database
Create a mongodb with [atlas](https://www.mongodb.com/atlas/database) for example.

```npm install```
```tsc```
```node dist/index.js```

### License
MIT
