import { KeyPair, PrivateKey } from '@nimiq/core'
import { getClient } from './consensus.js'

async function main() {
  console.log('🚀 Starting Nimiq client...')

  // Setup consensus (moved to separate file for clarity)
  const client = await getClient()

  // Generate a new wallet using PrivateKey.generate()
  const privateKey = PrivateKey.generate()

  // Create a KeyPair from the private key using KeyPair.derive()
  const keyPair = KeyPair.derive(privateKey)

  // Get the address from the keyPair using keyPair.toAddress()
  const address = keyPair.toAddress()

  // Log the user-friendly address and public key
  console.log('📍 Address:', address.toUserFriendlyAddress())
  console.log('🔐 Public Key:', keyPair.publicKey.toHex())

  // Check wallet balance using client.getAccount()
  const account = await client.getAccount(address.toUserFriendlyAddress())
  console.log('📊 Account:', account)

  // Convert balance from lunas to NIM (divide by 1e5) and display
  const nim = account.balance / 1e5
  console.log(`💰 Balance: ${nim} NIM`)
}

main()
