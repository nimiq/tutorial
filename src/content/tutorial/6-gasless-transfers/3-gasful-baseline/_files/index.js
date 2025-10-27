import { ethers } from 'ethers'
import { checkBalances } from './lib/balances.js'
import { POLYGON_CONFIG, USDT_ABI, USDT_DECIMALS } from './lib/constants.js'

// 🔐 Paste your private key from Lesson 1 here!
const PRIVATE_KEY = '0xPASTE_YOUR_PRIVATE_KEY_HERE_FROM_LESSON_1'

// Recipient address (Nimiq-controlled - contact us if you need funds back)
const RECEIVER_ADDRESS = '0xA3E49ef624bEaC43D29Af86bBFdE975Abaa0E184'

const TRANSFER_AMOUNT_USDT = '0.01' // Minimal amount for demo

async function main() {
  const POLYGON_RPC_URL = 'https://polygon-rpc.com'

  // STEP 1: create a provider connected to Polygon mainnet
  const provider = undefined // TODO

  // STEP 2: load the funded wallet and connect it to the provider
  const wallet = undefined // TODO

  console.log('Sender:', wallet.address)
  console.log('Receiver:', RECEIVER_ADDRESS)
  console.log('\n--- Balances before transfer ---')

  // STEP 3: Check balances using the helper function
  const balancesBefore = undefined // TODO: call checkBalances(provider, wallet, RECEIVER_ADDRESS)

  console.log('Sender MATIC:', balancesBefore.sender.polFormatted, POLYGON_CONFIG.nativeSymbol)
  console.log('Sender USDT:', balancesBefore.sender.usdtFormatted, 'USDT')
  console.log('Receiver USDT:', balancesBefore.receiver.usdtFormatted, 'USDT')

  // STEP 4: parse the USDT amount and send the transfer transaction
  const amountBaseUnits = undefined // TODO parseUnits

  console.log(`\nSending ${TRANSFER_AMOUNT_USDT} USDT to ${RECEIVER_ADDRESS}...`)

  // STEP 5: create USDT contract instance and transfer
  const usdt = undefined // TODO: new ethers.Contract(POLYGON_CONFIG.usdtTokenAddress, USDT_ABI, wallet)
  const transferTx = undefined // TODO call usdt.transfer

  console.log('Submitted tx:', `${POLYGON_CONFIG.explorerBaseUrl}${transferTx.hash}`)
  const receipt = await transferTx.wait()
  console.log('Mined in block', receipt.blockNumber)

  // STEP 6: re-check balances to confirm the transfer
  const balancesAfter = undefined // TODO: call checkBalances(provider, wallet, RECEIVER_ADDRESS)

  console.log('\n--- Balances after transfer ---')
  console.log('Sender USDT:', balancesAfter.sender.usdtFormatted, 'USDT')
  console.log('Receiver USDT:', balancesAfter.receiver.usdtFormatted, 'USDT')
}

main().catch((error) => {
  console.error(error)
})
