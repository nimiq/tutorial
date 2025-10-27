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
  // TODO: Step 1 - Load wallet from your password
  // Hint: const wallet = createWalletFromPassword(WALLET_PASSWORD).connect(provider)

  // TODO: Step 2 - Connect to USDC contract with ABI
  // Hint: const USDC_ABI = ['function transfer(...)', 'function balanceOf(...)', ...]
  // Hint: const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet)

  // TODO: Step 3 - Check USDC balance
  // Hint: const balance = await usdc.balanceOf(wallet.address)

  // TODO: Step 4 - Send USDC (RECIPIENT already defined above)
  // Hint: const tx = await usdc.transfer(RECIPIENT, amountInBaseUnits)

  // TODO: Step 5 - Verify balances changed
}

main().catch(console.error)
