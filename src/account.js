import { Keyring } from "@polkadot/api"
import { getApi } from "./api.js"

export const initAccount = async () => {
  //const api = getApi
  const keyring = new Keyring({type: 'sr25519'})
  const account = keyring.addFromUri(process.env.MNEMONIC)
  /*
  const sub = keyring.accounts.subject.subscribe((accounts) => {
    accounts.forEach(({ json, option }) => {
      console.log(json)
      console.log(option)
    })

      // json is the stored data, including address
      // option is a { name: meta.name, value: address }

  })
  // at some point  when we are not interested anymore, we can unsubscribe
  sub.unsubscribe()*/
  return account
}
