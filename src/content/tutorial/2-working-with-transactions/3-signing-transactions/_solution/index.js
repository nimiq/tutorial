import { Address, KeyPair, PrivateKey, TransactionBuilder } from '@nimiq/core'
import { setupConsensus } from './lib/consensus.js'
import { requestFromFaucet } from './faucet.js'

console.log('🚀 Starting Nimiq client...')

async function main() {
  try {
    // Setup consensus (from previous lessons)
    const client = await setupConsensus()

    const headBlock = await client.getHeadBlock()
    console.log('📊 Current block height:', headBlock.height)
    const networkId = await client.getNetworkId()
    console.log('🌐 Network ID:', networkId)

    // Generate a new wallet
    const privateKey = PrivateKey.generate()
    const keyPair = KeyPair.derive(privateKey)
    const address = keyPair.toAddress()

    console.log('🎉 Wallet created!')
    console.log('📍 Address:', address.toUserFriendlyAddress())

    // Request funds from faucet
    console.log('💧 Requesting funds from faucet...')
    await requestFromFaucet(client, address)

    // Wait for funds to arrive
    console.log('⏳ Waiting for funds to arrive...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Read the current balance of our account
    const account = await client.getAccount(address.toUserFriendlyAddress())
    console.log('💰 Current balance:', account.balance / 1e5, 'NIM')

    // Get transaction history to find the sender of the first transaction (faucet)
    const txHistory = await client.getTransactionsByAddress(address)
    console.log(`📊 Found ${txHistory.length} transactions`)

    if (txHistory.length === 0) {
      console.log('❌ No transactions found in history')
      return
    }

    // Find the most recent transaction that is not from us (faucet transaction)
    const firstTx = txHistory.find(tx => tx.sender !== address.toUserFriendlyAddress())
    const recipientAddress = Address.fromUserFriendlyAddress(firstTx.sender)
    console.log('🔍 Faucet address found:', recipientAddress.toUserFriendlyAddress())

    // Calculate amounts for each transaction (half each)
    const halfBalance = BigInt(account.balance / 2)

    // Create a basic transaction sending half of the funds back to the faucet sender
    const basicTx = TransactionBuilder.newBasic(
      address, // sender
      recipientAddress, // recipient
      halfBalance, // value (half of balance)
      0n, // fee (0 in Nimiq!)
      headBlock.height, // validity start height
      networkId, // testnet or mainnet
    )

    console.log('📝 Basic transaction created:')
    console.log('  From:', basicTx.sender.toUserFriendlyAddress())
    console.log('  To:', basicTx.recipient.toUserFriendlyAddress())
    console.log('  Amount:', Number(basicTx.value) / 1e5, 'NIM')
    console.log('  Type: Basic')

    // Sign the basic transaction
    basicTx.sign(keyPair)
    console.log('✍️ Basic Transaction signed successfully!')

    // Send the basic transaction
    console.log('📤 Sending basic transaction...')
    const basicTxHash = await client.sendTransaction(basicTx)
    console.log('✅ Basic transaction sent! Hash:', basicTxHash.serializedTx)

    // Create an extended transaction with data sending the other half back
    const message = 'Nimiq is awesome!'
    const messageBytes = new TextEncoder().encode(message)

    const extendedTx = TransactionBuilder.newBasicWithData(
      address, // sender
      recipientAddress, // recipient
      messageBytes, // data
      halfBalance, // value (remaining half)
      0n, // fee (0 in Nimiq!)
      headBlock.height, // validity start height
      networkId, // testnet or mainnet
    )

    console.log('📝 Extended transaction created:')
    console.log('  From:', extendedTx.sender.toUserFriendlyAddress())
    console.log('  To:', extendedTx.recipient.toUserFriendlyAddress())
    console.log('  Amount:', Number(extendedTx.value) / 1e5, 'NIM')
    console.log('  Message:', message)
    console.log('  Type: Extended with Data')

    // Sign the extended transaction
    extendedTx.sign(keyPair)
    console.log('✍️ Extended Transaction signed successfully!')

    // Send the extended transaction
    console.log('📤 Sending extended transaction...')
    const extendedTxHash = await client.sendTransaction(extendedTx)
    console.log('✅ Extended transaction sent! Hash:', extendedTxHash.serializedTx)

    // Display summary
    console.log('\n🎉 Transaction Summary:')
    console.log('📝 Basic Transaction Hash:', basicTxHash.serializedTx)
    console.log('📝 Extended Transaction Hash:', extendedTxHash.serializedTx)
    console.log('💰 Total Amount Sent:', Number(basicTx.value + extendedTx.value) / 1e5, 'NIM')
    console.log('📤 Both transactions sent successfully!')
  }
  catch (error) {
    console.error('❌ Error:', error.message)
  }
}

main()
