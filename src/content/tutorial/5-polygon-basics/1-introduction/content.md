---
type: lesson
title: "Introduction to Polygon"
focus: /index.js
mainCommand: npm run demo
prepareCommands:
  - npm install
terminal:
  open: true
  activePanel: 0
  panels: ['output']
---

# Introduction to Polygon

Welcome to Polygon Basics! Over the next three lessons you will assemble a complete transaction workflow on Polygon: create wallets, fund them with test assets, and move both native POL and ERC20 tokens. Each lesson flows step by step so you can focus on the concepts rather than deciphering shorthand.

---

## Why Polygon?

**Polygon** is an Ethereum Layer 2 network designed to feel familiar while solving Ethereum's biggest pain points.
- **Same developer experience**: It speaks the Ethereum Virtual Machine (EVM), so tools like ethers.js, Hardhat, or MetaMask work without modification.
- **Lower transaction costs**: Fees are measured in fractions of a cent instead of whole dollars.
- **Faster confirmations**: Blocks land roughly every two seconds, keeping interactions snappy.
- **Ecosystem interoperability**: Assets and dApps can bridge between Polygon and Ethereum, so knowledge transfers directly.

Think of Polygon as Ethereum's faster, more affordable sibling that still shares the family DNA.

---

## Meet Polygon Amoy

For this section we use **Polygon Amoy**, the current Polygon testnet. It mirrors mainnet behavior while using valueless tokens, which makes it ideal for experimentation.

- **Network Name**: Polygon Amoy Testnet  
- **Chain ID**: 80002  
- **RPC URL**: https://rpc-amoy.polygon.technology  
- **Block Explorer**: https://amoy.polygonscan.com  
- **Native Token**: POL (pays gas fees)

Because every token on Amoy is free, you can try ideas, make mistakes, and rerun scripts without worrying about real money.

---

## What You Will Build

By the end of this part you will have a working toolkit for everyday Polygon development:

### Lesson 2: Polygon Wallet Setup & Faucets
- Generate an Ethereum-compatible wallet with ethers.js.
- Connect that wallet to Polygon Amoy.
- Collect free POL and USDC from public faucets.
- Read balances programmatically so you can verify funding.

### Lesson 3: Sending POL Transactions
- Craft and broadcast native POL transfers.
- Inspect gas usage and confirmation receipts.
- Follow the transaction lifecycle on PolygonScan.

### Lesson 4: ERC20 Tokens & USDC Transfers
- Review the ERC20 interface and why it matters.
- Interact with token contracts through ABIs.
- Send USDC and account for its six decimal places.

Each lesson builds on the previous one, so keep your project files handy as you progress.

---

## Why These Skills Matter

Mastering Polygon translates directly to the broader EVM ecosystem:
- Mainnet Ethereum and Layer 2 networks such as Optimism, Arbitrum, and Base share the same patterns.
- Sidechains like BNB Chain or Avalanche use identical wallet and contract workflows.
- Any project that relies on ethers.js or web3.js expects these fundamentals.

Once you are comfortable on Polygon, you can approach most EVM-based platforms with confidence.

---

## The Demo Script

The code bundled with this lesson is a complete end-to-end walkthrough of everything you will build in Lessons 2-4. The demo runs automatically when you open this lesson—just check the terminal output. Treat it as a living reference:
- **Review the terminal** to see the final experience in action.
- **Copy individual snippets** as you implement each step in the subsequent lessons.
- **Compare your work** against the finished version if you get stuck.

The script demonstrates how to:
1. Create a wallet and connect to Polygon Amoy.
2. Check POL and USDC balances.
3. Send POL to another address.
4. Transfer USDC (an ERC20 token) safely.

> 💡 **Heads-up**: You will still need faucet funds before the demo shows non-zero balances. Lesson 2 covers that process. Until then you will see warnings about missing tokens.

---

## Next Up

Continue to **Lesson 2: Polygon Wallet Setup & Faucets** to create your first Polygon wallet and stock it with testnet tokens.
