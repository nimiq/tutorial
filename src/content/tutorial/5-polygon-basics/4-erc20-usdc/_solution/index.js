import { ethers } from 'ethers'
import { createWalletFromPassword } from './lib/wallet.js'

const RPC_URL = 'https://rpc-amoy.polygon.technology'
const USDC_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'
const AMOUNT = '0.01'

// 🔐 Use the SAME password from lesson 1 to access your wallet!
const WALLET_PASSWORD = 'change_me_to_something_unique_like_pizza_unicorn_2024'

// Recipient address (Nimiq-controlled - see lesson 1 for details)
const RECIPIENT = '0xA3E49ef624bEaC43D29Af86bBFdE975Abaa0E184'

async function main() {
  // Step 1: Load wallet from your password
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
  const wallet = createWalletFromPassword(WALLET_PASSWORD).connect(provider)
  console.log('🔑 Sender:', wallet.address)

  // Step 2: Connect to USDC contract
  const USDC_ABI = ['function transfer(address to, uint256 amount) returns (bool)', 'function balanceOf(address account) view returns (uint256)', 'function decimals() view returns (uint8)']
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet)

  // Step 3: Check balance
  const decimals = await usdc.decimals()
  const balance = await usdc.balanceOf(wallet.address)
  console.log('💵 USDC Balance:', ethers.utils.formatUnits(balance, decimals), 'USDC')

  // Step 4: Send USDC
  console.log('\\n📤 Sending USDC')
  console.log('├─ To:', RECIPIENT)
  console.log('└─ Amount:', AMOUNT, 'USDC')

  // Get current gas price and ensure minimum for Polygon
  const feeData = await provider.getFeeData()
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.lt(ethers.utils.parseUnits('30', 'gwei'))
    ? ethers.utils.parseUnits('30', 'gwei')
    : feeData.maxPriorityFeePerGas

  // Ensure maxFeePerGas is higher than maxPriorityFeePerGas
  const maxFeePerGas = feeData.maxFeePerGas.lt(maxPriorityFeePerGas)
    ? maxPriorityFeePerGas.mul(2)
    : feeData.maxFeePerGas

  const amountInBaseUnits = ethers.utils.parseUnits(AMOUNT, decimals)
  const tx = await usdc.transfer(RECIPIENT, amountInBaseUnits, {
    maxPriorityFeePerGas,
    maxFeePerGas
  })
  console.log('\\n⏳ Transaction sent!')
  console.log('├─ Hash:', tx.hash)
  console.log('├─ Explorer:', `https://amoy.polygonscan.com/tx/${tx.hash}`)
  console.log('└─ Waiting for confirmation...')

  const receipt = await tx.wait()
  console.log('\\n✅ Confirmed in block:', receipt.blockNumber)

  // Step 5: Verify balances
  const newBalance = await usdc.balanceOf(wallet.address)
  const recipientBalance = await usdc.balanceOf(RECIPIENT)
  console.log('\\n📊 Updated Balances')
  console.log('├─ Your USDC:', ethers.utils.formatUnits(newBalance, decimals))
  console.log('└─ Recipient USDC:', ethers.utils.formatUnits(recipientBalance, decimals))

  const polBalance = await provider.getBalance(wallet.address)
  console.log('\\n⛽ Gas paid in POL:', ethers.utils.formatEther(polBalance))
}

main().catch(console.error)
