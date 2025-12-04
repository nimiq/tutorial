---
type: lesson
title: "Sending POL Transactions"
focus: /index.js
mainCommand: npm run send
prepareCommands:
  - npm install
terminal:
  open: true
  activePanel: 0
  panels: ['output']
---

# Sending POL Transactions

With your wallet funded, it is time to perform a live transaction on Polygon Amoy. Understand the concept, walk through each step deliberately, and then experiment on your own.

---

## Essential Context: POL

**POL** (formerly called MATIC) is Polygon's native currency. Every on-chain action pays a small amount of POL as a gas fee, which compensates validators for processing your transaction.

- **Token type**: Native protocol asset, similar to ETH on Ethereum.
- **Gas currency**: All Polygon fees are charged in POL.
- **Decimals**: 18 (same as ETH).

Keep a small buffer of POL in your wallet; even ERC20 transfers consume it for gas.

> 💡 **Nimiq contrast:** Nimiq blockchain has zero transaction fees. No gas token, no fee calculations—just send. We will revisit this advantage in Section 6 when we tackle gasless transactions!

---

## Step 1: Load the Wallet

Reuse the `.env`-backed wallet you created earlier so you are not juggling multiple keys.

```js
import dotenv from 'dotenv'
import { ethers } from 'ethers'

dotenv.config()

const RPC_URL = 'https://rpc-amoy.polygon.technology'
const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

console.log('🔑 Sender Address:', wallet.address)
```

---

## Step 2: Confirm Available POL

Always confirm you have enough POL to cover the transfer plus gas.

```js
const balance = await provider.getBalance(wallet.address)
console.log('💰 Balance:', ethers.utils.formatEther(balance), 'POL')
```

Aim for at least `0.1 POL`. If you are low, revisit the faucet before continuing.

---

## Step 3: Prepare the Transfer

Choose a recipient address (another wallet you control works well) and decide how much to send.

```js
const RECIPIENT = '0x...' // Replace with any address
const AMOUNT_POL = '0.0001' // Minimal amount for demo

console.log('\n📤 Preparing Transaction')
console.log('├─ To:', RECIPIENT)
console.log('└─ Amount:', AMOUNT_POL, 'POL')
```

---

## Step 4: Broadcast the Transaction

Let ethers.js handle signing and broadcasting with a single call.

```js
const tx = await wallet.sendTransaction({
  to: RECIPIENT,
  value: ethers.utils.parseEther(AMOUNT_POL)
})

console.log('\n⏳ Transaction Sent!')
console.log('├─ Hash:', tx.hash)
console.log('└─ Waiting for confirmation...')
```

- `sendTransaction` creates and submits the transaction.
- `parseEther` converts human-readable POL into wei, the smallest unit.
- The transaction hash is your receipt number; keep it handy.

---

## Step 5: Wait for Confirmation

Transactions settle once they are included in a block. Wait for that confirmation before moving on.

```js
const receipt = await tx.wait()

console.log('\n✅ Transaction Confirmed!')
console.log('├─ Block:', receipt.blockNumber)
console.log('├─ Gas Used:', receipt.gasUsed.toString())
console.log('├─ Status:', receipt.status === 1 ? 'Success' : 'Failed')
console.log('└─ View on Explorer:', `https://amoy.polygonscan.com/tx/${tx.hash}`)
```

Open the explorer link to see the transaction exactly as validators processed it.

---

## Step 6: Reconcile Balances

Confirm both the transfer amount and the gas cost deducted from your wallet.

```js
const newBalance = await provider.getBalance(wallet.address)
const spent = balance.sub(newBalance)

console.log('\n📊 Balance Update')
console.log('├─ Before:', ethers.utils.formatEther(balance), 'POL')
console.log('├─ After:', ethers.utils.formatEther(newBalance), 'POL')
console.log('└─ Spent:', ethers.utils.formatEther(spent), 'POL (including gas)')
```

The difference between the sent amount and the total spent reflects the gas fee.

---

## Understanding Gas Fees

Every transfer has two cost components:

1. **Amount transferred**: The value delivered to the recipient.
2. **Gas fee**: The computational cost paid to validators.

```
Gas Fee = Gas Used × Gas Price
```

- **Gas Used** represents the work done (a simple transfer is roughly 21,000 units).
- **Gas Price** fluctuates with network demand.

On Polygon Amoy, these fees are tiny, but cultivating the habit of checking them now will pay off on higher-cost networks.

---

## Try-It Ideas

- Send POL to yourself to see how the receipt looks when sender and recipient match.
- Experiment with smaller or larger amounts and observe how gas usage stays consistent.
- Submit multiple transactions in a row and compare their block numbers and confirmation times.

---

## Wrap-Up

You have now:

- ✅ Broadcast your first Polygon transaction.
- ✅ Observed the full confirmation lifecycle.
- ✅ Calculated how gas fees affect balances.
- ✅ Gained confidence working with the POL native token.

Next, you will apply the same discipline to ERC20 tokens by sending USDC.
