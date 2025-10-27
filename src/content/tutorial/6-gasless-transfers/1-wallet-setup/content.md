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

Before working with gasless transactions on Polygon mainnet, you need a wallet with real funds. This lesson generates a fresh wallet and shows you how to secure it properly.

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

1. Visit **https://wallet.nimiq.com**
2. Select "Import with Recovery Words"
3. Paste your 24-word phrase
4. Access your wallet through a friendly interface

The Nimiq Wallet supports Polygon and makes managing tokens easier than the command line.

---

## Get Mainnet Funds

You need two types of tokens:

### USDC (for transfers)

Visit **https://faucet.circle.com/** to get testnet USDC that works on mainnet. You will need 2-5 USDC to complete the gasless lessons.

### POL (for gas in Lesson 2)

Visit **https://faucet.polygon.technology/** to get a small amount of POL. You only need ~0.1 POL for the baseline gasful transaction in the next lesson.

### USDT (no faucet available)

There is no public faucet for USDT on Polygon mainnet. If you want to follow along with USDT examples instead of USDC, you will need to:

- Purchase USDT on an exchange and withdraw to Polygon
- Swap USDC for USDT using a DEX like Uniswap
- Bridge USDT from Ethereum mainnet

> For this tutorial, USDC is recommended since it has faucet access.

---

## Save Your Private Key

Copy your **private key** from the terminal output. You will paste it directly into the code files in the following lessons. Each lesson will have a placeholder like:

```js
const PRIVATE_KEY = '0xPASTE_YOUR_PRIVATE_KEY_HERE_FROM_LESSON_1'
```

Replace that placeholder with your actual private key. Never commit files with your real private key to version control.

---

## Verify Your Setup

Before moving forward, confirm:

- ✅ Private key and mnemonic are stored securely
- ✅ Wallet address is funded with USDC and POL
- ✅ You understand the security risks

---

## Next Up

In **Lesson 2: Introduction to Gasless Transactions**, you will learn why gasless transactions matter and see the architecture that makes them possible.
