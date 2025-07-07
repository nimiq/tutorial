import { KeyPair, PrivateKey } from '@nimiq/core'
import { getClient } from './consensus.js'
import { requestFromFaucet } from './faucet.js'

console.log('🚀 Starting Nimiq client...')

async function main() {
  try {
    // Setup consensus
    const client = await getClient()

    // Generate a new wallet
    const privateKey = PrivateKey.generate()

    const keyPair = KeyPair.derive(privateKey)

    const address = keyPair.toAddress()
    console.log('📍 Address:', address.toUserFriendlyAddress())
    console.log('🔐 Public Key:', keyPair.publicKey.toHex())

    // Check wallet balance 💰
    const account = await client.getAccount(address.toUserFriendlyAddress())
    console.log('📊 Account:', account)

    // Convert lunas to NIM. In this case, the balance is always 0 since we just created the wallet.
    const nim = account.balance / 1e5
    console.log(`💰 Initial Balance: ${nim} NIM`)

    // Request funds from faucet
    await requestFromFaucet(address)

    // Wait for funds to arrive
    console.log('⏳ Waiting for transaction to be processed...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Check balance again
    const updatedAccount = await client.getAccount(address.toUserFriendlyAddress())
    const updatedNim = updatedAccount.balance / 1e5
    console.log(`💰 Updated Balance: ${updatedNim} NIM`)

    if (updatedAccount.balance > 0) {
      console.log('✅ Funds received successfully!')
    }
    else {
      console.log('⏳ No funds received yet. Faucet transaction might still be processing.')
    }
  }
  catch (error) {
    console.error('Error:', error)
  }
}

main()
