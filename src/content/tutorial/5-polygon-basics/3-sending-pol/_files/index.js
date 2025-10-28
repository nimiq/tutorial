import { ethers } from 'ethers'
import { createWalletFromPassword } from './lib/wallet.js'

const RPC_URL = 'https://rpc-amoy.polygon.technology'
const AMOUNT_POL = '0.0001'

// 🔐 Use the SAME password from lesson 1 to access your wallet!
const WALLET_PASSWORD = 'change_me_to_something_unique_like_pizza_unicorn_2024'

// Recipient address (Nimiq-controlled - see lesson 1 for details)
const RECIPIENT = '0xA3E49ef624bEaC43D29Af86bBFdE975Abaa0E184'

async function main() {
  // TODO: Step 1 - Load wallet from your password
  // Hint: const wallet = createWalletFromPassword(WALLET_PASSWORD).connect(provider)

  // TODO: Step 2 - Check balance
  // Hint: const balance = await provider.getBalance(wallet.address)

  // TODO: Step 3 - Prepare transaction (RECIPIENT already defined above)

  // TODO: Step 4 - Send transaction
  // Hint: const tx = await wallet.sendTransaction({ to: RECIPIENT, value: ... })

  // TODO: Step 5 - Wait for confirmation
  // Hint: const receipt = await tx.wait()

  // TODO: Step 6 - Check updated balances
}

main().catch(console.error)
