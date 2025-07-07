import { KeyPair, PrivateKey } from '@nimiq/core'
import { requestFromFaucet } from './faucet.js'

/**
 * Returns a wallet with funds from the faucet
 */
export async function getFundedWallet(client) {
  // Generate a new wallet
  const privateKey = PrivateKey.generate()
  const keyPair = KeyPair.derive(privateKey)
  const address = keyPair.toAddress()

  console.log('🎉 Wallet created!')
  console.log('📍 Address:', address.toUserFriendlyAddress())

  // Request funds from faucet - first half
  console.log('💧 Requesting first batch of funds from faucet...')
  await requestFromFaucet(client, address)

  // Wait for first funds to arrive
  console.log('⏳ Waiting for first funds to arrive...')
  await new Promise(resolve => setTimeout(resolve, 3000))

  let account = await client.getAccount(address)
  console.log('💰 First batch received:', account.balance / 1e5, 'NIM')

  // Request funds from faucet - second half
  console.log('💧 Requesting second batch of funds from faucet...')
  await requestFromFaucet(client, address)

  // Wait for second funds to arrive
  console.log('⏳ Waiting for second funds to arrive...')
  await new Promise(resolve => setTimeout(resolve, 3000))

  account = await client.getAccount(address)
  console.log('💰 Total balance:', account.balance / 1e5, 'NIM')

  return keyPair
}
