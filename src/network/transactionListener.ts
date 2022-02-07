import { ApiPromise } from "@polkadot/api";
import { botParams } from "../../config.js";
import { deposit } from "./accountHandler.js";
import { encodeAddress } from "@polkadot/util-crypto";
import { blockCountAdapter } from "../../tools/blockCountAdapter.js";
import { IStorageProvider } from "rmrk-tools/dist/listener";

export class TransactionListener {
    private apiPromise: ApiPromise;
    private initialised: boolean;
    private missingBlockFetchInitiated: boolean;
    private missingBlockEventsFetched: boolean;
    private currentBlockNumber: number;
    public storageProvider: IStorageProvider;
    constructor(
        polkadotApi: ApiPromise,
        storageProvider: IStorageProvider
    ) {
        if (!polkadotApi) {
            throw new Error(
                `"providerInterface" is missing. Please provide polkadot.js provider interface (i.e. websocket)`
            );
        }
        this.apiPromise = polkadotApi;
        this.initialised = false;
        this.missingBlockFetchInitiated = false;
        this.missingBlockEventsFetched = false;
        this.currentBlockNumber = 0;
        this.storageProvider =
            storageProvider || new blockCountAdapter(botParams.remarkStorage, "headerBlock");
        this.initialize();
    }

    private initialize = async () => {
        if (!this.initialised) {
            await this.initialiseListener();
            this.initialised = true;
        }
    };

    private fetchEventsAtBlock = async (blockNumber: number): Promise<void> => {
        const blockHash = await botParams.api.rpc.chain.getBlockHash(blockNumber);
        const block = await botParams.api.at(blockHash);
        const events = await block.query.system.events();
        if (events.length > 0) {
            try {
                await this.newEventsHandler(events, blockNumber);
            } catch (error) {
                console.log(new Date(), error);
            }
        }
    };

    private newEventsHandler = async (events, currentBlock) => {
        if (events.length > 0) {
            const depositEvents = events.filter(record => {
                return record.event.section === "balances" && record.event.method === "Transfer" &&
                    record.event.data[1].toString() === encodeAddress(botParams.account.address, botParams.settings.network.prefix);
            });
            depositEvents.forEach(event => {
                try {
                    deposit(event, currentBlock);
                } catch (error) {
                    console.log(new Date(), error);
                }
            });
        }
    };

    private fetchMissingBlockEvents = async (latestBlockDb: number, to: number): Promise<void> => {
        try {
            for (let i = latestBlockDb + 1; i <= to; i++) {
                await this.fetchEventsAtBlock(i);
            }
        } catch (error) {
            console.log(error);
        }
    };

    private async initialiseListener() {
        const headSubscriber = this.apiPromise.rpc.chain.subscribeFinalizedHeads;

        headSubscriber(async (header) => {
            const blockNumber = header.number.toNumber();
            if (blockNumber === 0) {
                console.error(
                    "Unable to retrieve finalized head - returned genesis block"
                );
            }

            if (!this.missingBlockEventsFetched && !this.missingBlockFetchInitiated) {
                this.missingBlockFetchInitiated = true;
                const latestBlock = await this.storageProvider.get();
                await this.fetchMissingBlockEvents(latestBlock, blockNumber - 1);
                this.missingBlockEventsFetched = true;
            }

            this.fetchEventsAtBlock(blockNumber);

            // Update local db latestBlock
            if (
                this.missingBlockEventsFetched
            ) {
                try {
                    if (this.currentBlockNumber < blockNumber) this.currentBlockNumber = blockNumber;
                    await this.storageProvider.set(this.currentBlockNumber);
                } catch (e: any) {
                    console.error(e);
                }
            }
        });

        return;
    }
}