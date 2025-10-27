---
type: lesson
title: "USDC Transfers on Mainnet"
focus: /index.js
mainCommand: npm run send
prepareCommands:
  - npm install
terminal:
  open: true
  activePanel: 0
  panels: ['output']
---

# USDC Transfers on Mainnet

Send native USDC on Polygon mainnet. Similar to testnet transfers, but with real value.

---

## Native USDC

Polygon has native USDC issued by Circle:

```js
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
```

This is different from bridged USDC (USDC.e). Native USDC has:
- Better liquidity
- Lower fees
- Direct Circle support

---

## Sending USDC

Same pattern as testnet, but on mainnet:

```js
import { ethers } from 'ethers'
import { POLYGON_RPC_URL, USDC_ADDRESS, USDC_ABI } from './lib/config.js'

const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL)
const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet)

// Check balance
const balance = await usdc.balanceOf(wallet.address)
console.log('USDC Balance:', ethers.utils.formatUnits(balance, 6))

// Transfer
const amount = ethers.utils.parseUnits('0.01', 6)
const tx = await usdc.transfer(RECIPIENT, amount)
await tx.wait()
```

---

## Gas Fees

Mainnet transactions cost real POL:
- USDC transfer: ~50,000-65,000 gas
- At 30 gwei: ~0.0015-0.002 POL per transfer
- POL price: varies ($0.30-$0.60)

Keep ~0.1 POL in wallet for gas.

---

## Get USDC

Mainnet USDC from:
- https://faucet.circle.com/ (testnet amounts)
- Exchanges (Coinbase, Binance)
- DEX swaps (Uniswap, QuickSwap)
- Bridges from Ethereum

---

## Wrap-Up

You can now:
- ✅ Transfer native USDC on Polygon mainnet
- ✅ Pay gas fees in POL
- ✅ Verify transactions on PolygonScan

Next section: Gasless transfers (no POL needed!)
