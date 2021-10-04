import { ApiPromise, WsProvider } from "@polkadot/api"
import { cryptoWaitReady } from "@polkadot/util-crypto";

export const getApi = async (): Promise<ApiPromise> => {
  await cryptoWaitReady()
  const wsNodeUri = process.env.WS_NODE_URI || "ws://127.0.0.1:9944/"
  const wsProvider = new WsProvider(wsNodeUri)
  const api = await ApiPromise.create({ provider: wsProvider })
  return api
}
