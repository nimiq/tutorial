import { ethers } from 'ethers'
import { POLYGON_RPC_URL, USDC_ADDRESS, USDC_ABI, USDC_DECIMALS, TRANSFER_AMOUNT, RECIPIENT_ADDRESS, EXPLORER_BASE_URL } from './lib/config.js'

// 🔐 Paste your private key from Lesson 1 here!
const PRIVATE_KEY = '0xPASTE_YOUR_PRIVATE_KEY_HERE_FROM_LESSON_1'

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

  console.log('🔑 Sender:', wallet.address)
  console.log('📍 Recipient:', RECIPIENT_ADDRESS)

  // Connect to USDC contract
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet)

  // Check balance
  const balance = await usdc.balanceOf(wallet.address)
  console.log('💵 USDC Balance:', ethers.utils.formatUnits(balance, USDC_DECIMALS), 'USDC')

  // Send USDC
  console.log(`\n📤 Sending ${TRANSFER_AMOUNT} USDC...`)

  const feeData = await provider.getFeeData()
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.lt(ethers.utils.parseUnits('30', 'gwei'))
    ? ethers.utils.parseUnits('30', 'gwei')
    : feeData.maxPriorityFeePerGas

  const maxFeePerGas = feeData.maxFeePerGas.lt(maxPriorityFeePerGas)
    ? maxPriorityFeePerGas.mul(2)
    : feeData.maxFeePerGas

  const amountInBaseUnits = ethers.utils.parseUnits(TRANSFER_AMOUNT, USDC_DECIMALS)
  const tx = await usdc.transfer(RECIPIENT_ADDRESS, amountInBaseUnits, {
    maxPriorityFeePerGas,
    maxFeePerGas
  })

  console.log('⏳ Transaction sent!')
  console.log('├─ Hash:', tx.hash)
  console.log('├─ Explorer:', `${EXPLORER_BASE_URL}${tx.hash}`)
  console.log('└─ Waiting for confirmation...')

  const receipt = await tx.wait()
  console.log('\n✅ Confirmed in block:', receipt.blockNumber)

  // Check new balance
  const newBalance = await usdc.balanceOf(wallet.address)
  console.log('\n📊 Updated Balance')
  console.log('└─ Your USDC:', ethers.utils.formatUnits(newBalance, USDC_DECIMALS))

  const polBalance = await provider.getBalance(wallet.address)
  console.log('\n⛽ POL Balance:', ethers.utils.formatEther(polBalance), '(gas was paid in POL)')
}

main().catch(console.error)
