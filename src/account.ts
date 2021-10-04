import { Keyring } from "@polkadot/api"
import { KeyringPair } from "@polkadot/keyring/types"

export const initAccount = (): KeyringPair => {
  const keyring = new Keyring({type: "sr25519"})
  const account = keyring.addFromUri(process.env.MNEMONIC)
  return account
}
