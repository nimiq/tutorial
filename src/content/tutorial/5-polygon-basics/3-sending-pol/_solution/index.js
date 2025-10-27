import { ethers } from 'ethers'
import { createWalletFromPassword } from './lib/wallet.js'

const RPC_URL = 'https://rpc-amoy.polygon.technology'
const AMOUNT_POL = '0.0001'

// 🔐 Use the SAME password from lesson 1 to access your wallet!
const WALLET_PASSWORD = 'change_me_to_something_unique_like_pizza_unicorn_2024'

// Recipient address (Nimiq-controlled - see lesson 1 for details)
const RECIPIENT = '0xA3E49ef624bEaC43D29Af86bBFdE975Abaa0E184'

async function main() {
  // Step 1: Load wallet from your password
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
  const wallet = createWalletFromPassword(WALLET_PASSWORD).connect(provider)
  console.log('🔑 Sender Address:', wallet.address)

  // Step 2: Check balance
  const balance = await provider.getBalance(wallet.address)
  console.log('💰 Balance:', ethers.utils.formatEther(balance), 'POL')

  // Step 3: Set up transaction
  console.log('\\n📤 Preparing Transaction')
  console.log('├─ To:', RECIPIENT)
  console.log('└─ Amount:', AMOUNT_POL, 'POL')

  // Step 4: Send transaction with proper gas settings
  // Get current gas price and ensure minimum for Polygon
  const feeData = await provider.getFeeData()
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.lt(ethers.utils.parseUnits('30', 'gwei'))
    ? ethers.utils.parseUnits('30', 'gwei')
    : feeData.maxPriorityFeePerGas

  // Ensure maxFeePerGas is higher than maxPriorityFeePerGas
  const maxFeePerGas = feeData.maxFeePerGas.lt(maxPriorityFeePerGas)
    ? maxPriorityFeePerGas.mul(2)
    : feeData.maxFeePerGas

  const tx = await wallet.sendTransaction({
    to: RECIPIENT,
    value: ethers.utils.parseEther(AMOUNT_POL),
    maxPriorityFeePerGas,
    maxFeePerGas
  })
  console.log('\\n⏳ Transaction Sent!')
  console.log('├─ Hash:', tx.hash)
  console.log('├─ Explorer:', `https://amoy.polygonscan.com/tx/${tx.hash}`)
  console.log('└─ Waiting for confirmation...')

  // Step 5: Wait for confirmation
  const receipt = await tx.wait()
  console.log('\\n✅ Transaction Confirmed!')
  console.log('├─ Block:', receipt.blockNumber)
  console.log('├─ Gas Used:', receipt.gasUsed.toString())
  console.log('├─ Status:', receipt.status === 1 ? 'Success' : 'Failed')
  console.log('└─ View on Explorer:', `https://amoy.polygonscan.com/tx/${tx.hash}`)

  // Step 6: Check updated balances
  const newBalance = await provider.getBalance(wallet.address)
  const spent = balance.sub(newBalance)
  console.log('\\n📊 Balance Update')
  console.log('├─ Before:', ethers.utils.formatEther(balance), 'POL')
  console.log('├─ After:', ethers.utils.formatEther(newBalance), 'POL')
  console.log('└─ Spent:', ethers.utils.formatEther(spent), 'POL (including gas)')
}

main().catch(console.error)
