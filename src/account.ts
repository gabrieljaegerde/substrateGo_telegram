import { Keyring } from "@polkadot/api"

export const initAccount = async () => {
  const keyring = new Keyring({type: 'sr25519'})
  const account = keyring.addFromUri(process.env.MNEMONIC)
  return account
}
