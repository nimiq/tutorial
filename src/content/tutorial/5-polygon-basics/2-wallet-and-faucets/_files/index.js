import { ethers } from 'ethers'
import { createWalletFromPassword } from './lib/wallet.js'

const RPC_URL = 'https://rpc-amoy.polygon.technology'
const USDC_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'
const USDC_ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)']

// 🔐 IMPORTANT: Use the SAME password you chose in lesson 1!
// Same password = same wallet address = your funds will be there
const WALLET_PASSWORD = 'change_me_to_something_unique_like_pizza_unicorn_2024'

async function main() {
  // TODO: Step 1 - Create wallet from your password (same as lesson 1)
  // Hint: const wallet = createWalletFromPassword(WALLET_PASSWORD)

  // TODO: Step 2 - Connect wallet to Polygon Amoy provider
  // Hint: const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
  // Hint: const connectedWallet = wallet.connect(provider)

  // TODO: Step 3 - Check POL balance
  // Hint: const balance = await provider.getBalance(wallet.address)
  // Hint: console.log('POL Balance:', ethers.utils.formatEther(balance))

  // TODO: Step 4 - Check USDC balance
  // Hint: const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
  // Hint: const usdcBalance = await usdc.balanceOf(wallet.address)
}

main().catch(console.error)
