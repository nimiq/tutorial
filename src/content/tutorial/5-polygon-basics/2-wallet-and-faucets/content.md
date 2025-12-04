---
type: lesson
title: "Polygon Wallet Setup & Faucets"
focus: /index.js
mainCommand: npm run dev
prepareCommands:
  - npm install
terminal:
  open: true
  activePanel: 0
  panels: ['output']
---

# Polygon Wallet Setup & Faucets

Welcome to your first hands-on Polygon exercise. Before you can broadcast transactions or interact with smart contracts, you need two building blocks: a wallet that can sign messages and a source of test tokens. This lesson guides you through both with the same balance of narrative and structure used in the earlier chapters.

---

## Learning Goals

By the end of this lesson you will:

- **Generate an Ethereum-compatible wallet** with ethers.js and understand the difference between its private key and public address.
- **Connect the wallet to Polygon Amoy**, Polygon's public testnet.
- **Collect free POL** to pay for gas in upcoming lessons.
- **Collect free USDC** so you can practice ERC20 transfers later.
- **Store sensitive credentials safely** using environment variables.

---

## Why It Matters

Wallets sit at the heart of every Web3 interaction. Whether you are experimenting with DeFi, NFTs, or the gasless payments you will build in Section 6, you must be able to:

- Create and back up keypairs responsibly.
- Talk to an RPC endpoint for the network you target.
- Verify balances before submitting transactions.
- Reuse credentials across scripts without exposing them.

Master these fundamentals now, and everything that follows will feel natural.

---

## Polygon Amoy Recap

We will work on **Polygon Amoy**, a no-stakes environment that mirrors Polygon mainnet:

- **Network**: Polygon Amoy Testnet
- **Native Token**: POL (covers gas fees)
- **RPC URL**: https://rpc-amoy.polygon.technology
- **Chain ID**: 80002

Because test tokens on Amoy have zero real-world value, you can experiment freely and rerun scripts as often as you like.

---

## Step 1: Create a Wallet

A wallet consists of a private key (keep it secret) and the public address you can share. Use ethers.js to generate both in one line:

```js
import { ethers } from 'ethers'

// Create a random wallet
const wallet = ethers.Wallet.createRandom()

console.log('🔑 Your New Wallet')
console.log('├─ Address:', wallet.address)
console.log('└─ Private Key:', wallet.privateKey)
```

> ⚠️ **Security Note**: Logging private keys is acceptable in a controlled tutorial with test funds, but never do this in production or with real assets.

---

## Step 2: Connect to Polygon Amoy

Next, connect the wallet to an RPC endpoint so it can read state and submit transactions.

```js
const RPC_URL = 'https://rpc-amoy.polygon.technology'
const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
const connectedWallet = wallet.connect(provider)
```

- `provider` handles network communication.
- `connectedWallet` binds your wallet to that provider, so signing and broadcasting are ready to go.

---

## Step 3: Check Your Balance

Fresh wallets start empty, but it is good practice to confirm that expectation programmatically.

```js
const balance = await provider.getBalance(wallet.address)
console.log('\n💰 Balance:', ethers.utils.formatEther(balance), 'POL')
```

You should see `0.0 POL`, confirming the wallet has not been funded yet.

---

## Step 4: Claim Free POL from the Faucet

Faucets distribute play tokens for testnets. Follow these steps to fund your wallet with POL:

1. Copy the address printed in your console.
2. Visit the Polygon faucet at https://faucet.polygon.technology/.
3. Choose "Polygon Amoy" from the dropdown.
4. Paste your address and submit the request.

Within roughly 30 seconds, the faucet should confirm the transfer. Run your script again to verify that the POL balance increased. You can also check your address on the explorer: https://amoy.polygonscan.com/address/<your-address>

> Faucet tips
>
> If the faucet rate-limits you, wait a few minutes and retry. Make sure “Polygon Amoy” is selected. Some public faucets require sign-in or a CAPTCHA.

---

## Step 5: Claim Free USDC

Later lessons rely on an ERC20 token, so grab some USDC while you are here. You can get USDC from either of these faucets:

**Option 1: Polygon Faucet** (also gives POL)

1. Visit https://faucet.polygon.technology/.
2. Choose "Polygon Amoy" from the dropdown.
3. Paste your wallet address and submit.

**Option 2: Circle Faucet**

1. Open https://faucet.circle.com/.
2. Select "Polygon Amoy" as the network.
3. Paste your wallet address.
4. Complete the CAPTCHA and submit.

To inspect your USDC balance you must query the token contract directly:

> Note on test tokens
>
> USDC testnet addresses can change. If the address returns zero unexpectedly, verify the current Amoy USDC address from official sources (faucet/docs) before assuming a code issue.

```js
const USDC_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'
const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)'
]

const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
const usdcBalance = await usdc.balanceOf(wallet.address)
const decimals = await usdc.decimals()

console.log('\n💵 USDC Balance:', ethers.utils.formatUnits(usdcBalance, decimals), 'USDC')
```

---

## Step 6: Store the Private Key Securely

Persist your wallet so future lessons can reuse it. Create a `.env` file and add your key:

```bash
PRIVATE_KEY=your_private_key_here
```

Load it in your script before creating the wallet instance:

```js
import dotenv from 'dotenv'

dotenv.config()

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY)
```

> 💡 **Pro Tip**: Add `.env` to `.gitignore` so sensitive keys never end up in version control.

---

## Wrap-Up

You now have everything required for real Polygon workflows:

- ✅ A reusable Ethereum-compatible wallet.
- ✅ POL to cover transaction fees on Polygon Amoy.
- ✅ USDC for ERC20 experiments.
- ✅ Environment variable management for safe credential storage.

In the next lesson, you will send your first on-chain POL transfer and watch it confirm in real time.
