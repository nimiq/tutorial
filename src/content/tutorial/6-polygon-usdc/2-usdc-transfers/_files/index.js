import { ethers } from 'ethers'
import { POLYGON_RPC_URL, USDC_ADDRESS, USDC_ABI, USDC_DECIMALS, TRANSFER_AMOUNT, RECIPIENT_ADDRESS, EXPLORER_BASE_URL } from './lib/config.js'

// 🔐 Paste your private key from Lesson 1 here!
const PRIVATE_KEY = '0xPASTE_YOUR_PRIVATE_KEY_HERE_FROM_LESSON_1'

async function main() {
  // TODO: Create provider
  const provider = undefined

  // TODO: Create wallet from private key
  const wallet = undefined

  console.log('🔑 Sender:', wallet.address)
  console.log('📍 Recipient:', RECIPIENT_ADDRESS)

  // TODO: Connect to USDC contract
  const usdc = undefined

  // TODO: Check balance
  const balance = undefined

  console.log('💵 USDC Balance:', ethers.utils.formatUnits(balance, USDC_DECIMALS), 'USDC')

  // TODO: Send USDC
  console.log(`\n📤 Sending ${TRANSFER_AMOUNT} USDC...`)

  // TODO: Get fee data and set gas prices
  const feeData = undefined
  const maxPriorityFeePerGas = undefined
  const maxFeePerGas = undefined

  // TODO: Parse amount and transfer
  const amountInBaseUnits = undefined
  const tx = undefined

  console.log('⏳ Transaction sent!')
  console.log('├─ Hash:', tx.hash)
  console.log('├─ Explorer:', `${EXPLORER_BASE_URL}${tx.hash}`)
  console.log('└─ Waiting for confirmation...')

  const receipt = await tx.wait()
  console.log('\n✅ Confirmed in block:', receipt.blockNumber)

  // TODO: Check new balance
  const newBalance = undefined

  console.log('\n📊 Updated Balance')
  console.log('└─ Your USDC:', ethers.utils.formatUnits(newBalance, USDC_DECIMALS))

  const polBalance = await provider.getBalance(wallet.address)
  console.log('\n⛽ POL Balance:', ethers.utils.formatEther(polBalance), '(gas was paid in POL)')
}

main().catch(console.error)
