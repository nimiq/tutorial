import { AccountType, Address, BufferUtils, KeyPair, SerialBuffer, Transaction, TransactionFlag } from '@nimiq/core'
import { Utf8Tools } from '@nimiq/utils/utf8-tools'

import { setupConsensus } from './lib/consensus.js'
import { getFundedWallet } from './lib/wallet.js'

function getCashlinkUrl(network, cashlinkKeyPair, amount, message) {
  const hubDomain = network === 'MainAlbatross'
    ? 'https://hub.nimiq.com'
    : 'https://hub.nimiq-testnet.com'

  const messageBytes = Utf8Tools.stringToUtf8ByteArray(message)

  const buf = new SerialBuffer(
    cashlinkKeyPair.privateKey.serializedSize // key
    + 8 // value
    + (messageBytes.byteLength ? 1 : 0) // message or not message
    + messageBytes.byteLength, // message length
  )

  buf.write(cashlinkKeyPair.privateKey.serialize())
  buf.writeUint64(amount)

  if (messageBytes.byteLength) {
    buf.writeUint8(messageBytes.byteLength)
    buf.write(messageBytes)
  }

  const hashUrl = BufferUtils
    .toBase64Url(buf)
    .replace(/\./g, '=') // replace trailing . by = because of URL parsing issues on iPhone.
    .replace(/\w{257,}/g, match => match.replace(/.{256}/g, '$&~')) // break long words by adding a ~ every 256 characters

  return `${hubDomain}/cashlink/#${hashUrl}`
}

const CashlinkExtraData = {
  Funding: [0].concat('CASH'.split('').map(c => c.charCodeAt(0) + 63)),
  Claiming: [0].concat('LINK'.split('').map(c => c.charCodeAt(0) + 63)),
}

async function fundCashlink(client, keyPair, cashlinkAddress, amount) {
  const headBlock = await client.getHeadBlock()
  const networkId = await client.getNetworkId()

  const tx = new Transaction(
    keyPair.toAddress(), // sender
    AccountType.Basic, // account type
    new Uint8Array(0), // sender data
    cashlinkAddress, // recipient
    AccountType.Basic, // account type
    CashlinkExtraData.Funding, // message
    BigInt(amount),
    0n, // fee
    TransactionFlag.None,
    headBlock.height,
    networkId,
  )

  tx.sign(keyPair)
  const txHash = await client.sendTransaction(tx)
  return txHash
}

/**
 * Sets up transaction listeners for cashlink funding and claiming
 */
async function setupCashlinkListeners(client, cashlinkAddress, senderAddress) {
  await client.addTransactionListener(
    (transaction) => {
      const recipient = Address.fromUserFriendlyAddress(transaction.recipient)
      const sender = Address.fromUserFriendlyAddress(transaction.sender)
      const isIncoming = recipient.equals(cashlinkAddress)
      const isOutgoing = sender.equals(cashlinkAddress)

      if (isIncoming) {
        console.log('\n💰 CASH LINK FUNDED!')
        console.log(`├─ Amount: ${transaction.value / 1e5} NIM`)
        console.log(`├─ From: ${transaction.sender}`)
        console.log(`├─ To: ${transaction.recipient}`)
        console.log(`└─ Transaction Hash: ${transaction.transactionHash}`)
      }

      if (isOutgoing) {
        console.log('\n🔓 CASH LINK CLAIMED!')
        console.log(`├─ Amount: ${transaction.value / 1e5} NIM`)
        console.log(`├─ From: ${transaction.sender}`)
        console.log(`├─ To: ${transaction.recipient}`)
        console.log(`└─ Transaction Hash: ${transaction.transactionHash}`)
      }
    },
    [cashlinkAddress, senderAddress], // Listen to both addresses
  )

  console.log('📡 Monitoring for cashlink funding and claiming...\n')
}

async function main() {
  try {
    const network = 'TestAlbatross'
    const client = await setupConsensus(network)

    const keyPair = await getFundedWallet(client)
    const senderAddress = keyPair.toAddress()

    const amount = 1e5 // 1 NIM in Luna
    const message = 'Enjoy your NIM!'
    const hubDomain = network === 'MainAlbatross' ? 'https://hub.nimiq.com' : 'https://hub.nimiq-testnet.com'

    // Generate a new keypair for the cashlink
    const cashlinkKeyPair = KeyPair.generate()
    const cashlinkAddress = cashlinkKeyPair.toAddress()

    // Generate the cashlink URL
    const cashlinkUrl = getCashlinkUrl(network, cashlinkKeyPair, amount, message)

    // Set up transaction listeners
    await setupCashlinkListeners(client, cashlinkAddress, senderAddress)

    // Fund the cashlink
    const tx = await fundCashlink(client, keyPair, cashlinkAddress, amount)

    // Print the cashlink URL
    console.log('\n🎉 Cashlink created successfully!')
    console.log(`\n\n 👉 Transaction Hash: ${tx.transactionHash}`)
    console.log(`\n\n 👉 Share or open this URL with someone to let them claim ${amount / 1e5} NIM!\n${cashlinkUrl}\n`)
    console.log('\n⏰ Keep this script running to see when the cashlink is claimed...')
  }
  catch (error) {
    console.error('❌ Error:', error.message)
  }
}

main()
