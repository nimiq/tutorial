---
type: lesson
title: "Mainnet Wallet Setup"
focus: /index.js
mainCommand: npm run generate
prepareCommands:
  - npm install
terminal:
  open: true
  activePanel: 0
  panels: ['output']
---

# Mainnet Wallet Setup

Before working with gasless transactions on Polygon mainnet, you need a wallet with real funds. This lesson generates a new wallet and shows you how to secure it properly.

---

## Why Mainnet?

Unlike Section 5, which used the Amoy testnet, this section requires **Polygon mainnet**. OpenGSN relay networks operate on mainnet where real economic incentives keep relays running. The patterns you learn here translate directly to production apps.

---

## Generate Your Wallet

Run the script to create a random wallet. You will receive three pieces of information:

1. **Address**: Your public identifier on Polygon.
2. **Private Key**: A 64-character hex string that controls your funds.
3. **24-Word Mnemonic**: A human-readable backup phrase.

```js
import { ethers } from 'ethers'

const wallet = ethers.Wallet.createRandom()

console.log('Address:', wallet.address)
console.log('Private Key:', wallet.privateKey)
console.log('Mnemonic:', wallet.mnemonic.phrase)
```

---

## Security First

⚠️ **CRITICAL**: Anyone with your private key or mnemonic can spend your funds.

**Do:**

- Store both in a password manager.
- Write the mnemonic on paper and keep it safe.
- Never share them with anyone.

**Don't:**

- Screenshot or email your credentials.
- Store them in plain text on your computer.
- Reuse this wallet for large amounts in production.

> This is a learning wallet. Keep only enough funds to complete the tutorial (~5 USDT and 0.1 POL).

---

## Import into Nimiq Wallet (Optional)

For a better UX, import your 24-word mnemonic into the Nimiq Wallet:

1. Visit https://wallet.nimiq.com
2. Select "Import with Recovery Words"
3. Paste your 24-word phrase
4. Access your wallet through a friendly interface

The Nimiq Wallet supports Polygon and makes managing tokens easier than the command line.

---

## Get Mainnet Funds

### USDT (for core gasless transfers)

You will use USDT for the baseline and OpenGSN lessons (Lessons 3–6). There is no public faucet for USDT on Polygon mainnet, so you must:

- Purchase USDT on an exchange and withdraw to Polygon
- Swap into USDT on Polygon using a DEX such as Uniswap
- Bridge USDT from Ethereum mainnet

Aim for 2–5 USDT to comfortably complete the exercises.

### USDC (for the permit lesson)

USDC is only needed for the EIP-2612 permit lesson (Lesson 7). For Polygon mainnet USDC you must use a real liquidity source. Typical options are:

- Purchase USDC on an exchange and withdraw directly to Polygon
- Bridge USDC from another chain (for example Ethereum mainnet) using a trusted bridge
- Swap into USDC on Polygon via a DEX such as Uniswap

If you want to practice on testnets before touching mainnet, you can use https://faucet.circle.com/ to obtain **testnet** USDC on supported networks. That testnet USDC is not usable on Polygon mainnet.

### POL (for gas in gasful baseline lesson)

For Polygon mainnet POL you cannot use the Polygon faucet (it only serves testnets like Amoy). Instead:

- Acquire POL on an exchange and withdraw to Polygon mainnet, or
- Bridge POL (or wrapped MATIC) from another network.

You only need ~0.1 POL for the baseline gasful transaction in the next lesson, but it must be real mainnet POL.

---

## Save Your Private Key

Copy your **private key** from the terminal output. In the following lessons, load it from an environment variable instead of hardcoding it in source code. For example:

```bash
# .env
SENDER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_FROM_LESSON_1
```

```js
import dotenv from 'dotenv'

dotenv.config()

const wallet = new ethers.Wallet(process.env.SENDER_PRIVATE_KEY, provider)
```

Never commit `.env` files with real private keys to version control.

---

## Verify Your Setup

Before moving forward, confirm:

- ✅ Private key and mnemonic are stored securely
- ✅ Wallet address is funded with USDC and POL
- ✅ You understand the security risks

---

## Next Up

In **Introduction to Gasless Transactions**, you will learn why gasless transactions matter and see the architecture that makes them possible.
