import { ethers } from 'ethers'
import { createWalletFromPassword } from './lib/wallet.js'

const RPC_URL = 'https://rpc-amoy.polygon.technology'
const USDC_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'
const USDC_ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)']

// 🔐 IMPORTANT: Use the SAME password you chose in lesson 1!
// Same password = same wallet address = your funds will be there
const WALLET_PASSWORD = 'change_me_to_something_unique_like_pizza_unicorn_2024'

async function main() {
  // Step 1: Create wallet from your password (same as lesson 1)
  const wallet = createWalletFromPassword(WALLET_PASSWORD)
  console.log('🔑 Your Wallet (from password)')
  console.log('├─ Address:', wallet.address)
  console.log('└─ Password:', WALLET_PASSWORD)

  if (WALLET_PASSWORD === 'change_me_to_something_unique_like_pizza_unicorn_2024') {
    console.log('\n⚠️  Using default password! Change WALLET_PASSWORD to match lesson 1.')
  }

  // Step 2: Connect to Polygon Amoy
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
  const connectedWallet = wallet.connect(provider)

  // Step 3: Check POL balance
  const balance = await provider.getBalance(wallet.address)
  console.log('\\n💰 POL Balance:', ethers.utils.formatEther(balance), 'POL')

  // Step 5: Check USDC balance
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
  const usdcBalance = await usdc.balanceOf(wallet.address)
  const decimals = await usdc.decimals()
  console.log('💵 USDC Balance:', ethers.utils.formatUnits(usdcBalance, decimals), 'USDC')

  console.log('\\n💡 Save this private key to .env file for future lessons!')
}

main().catch(console.error)
