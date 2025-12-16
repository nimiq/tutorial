---
type: lesson
title: "ERC20 Tokens & USDC Transfers"
focus: /index.js
mainCommand: npm run send
prepareCommands:
  - npm install
terminal:
  open: true
  activePanel: 0
  panels: ['output']
---

# ERC20 Tokens & USDC Transfers

Native POL transfers are only half the story on Polygon. The majority of assets you will handle live inside smart contracts that follow the ERC20 standard. In this lesson, you will apply everything you learned about wallets and providers to interact with **USDC**, a widely used stablecoin on Polygon Amoy.

---

## ERC20 Primer

**ERC20** defines a common interface that every compliant token must expose. Once you know the standard method names, you can work with almost any token:

- `transfer(to, amount)` moves tokens between addresses.
- `balanceOf(address)` reports the balance for a specific holder.
- `approve(spender, amount)` grants another address permission to move tokens on your behalf.
- `decimals()` reveals how many decimal places the token uses.

USDC conforms to this interface with the following Polygon Amoy details:

- **Token address**: `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
- **Decimals**: 6 (so 1 USDC equals 1,000,000 base units)

---

## POL vs. USDC at a Glance

| Feature         | POL                        | USDC                                       |
| --------------- | -------------------------- | ------------------------------------------ |
| Asset type      | Native protocol token      | ERC20 smart contract                       |
| Primary purpose | Pay gas fees               | Represent and transfer dollar-pegged value |
| Transfer call   | `wallet.sendTransaction()` | `contract.transfer()`                      |
| Decimal places  | 18                         | 6                                          |
| Who pays gas    | Sender (in POL)            | Still the sender (in POL)                  |

Understanding this table clarifies why sending USDC feels slightly different even though the wallet and provider setup stays the same.

---

## Step 1: Load the Wallet and Set Up the Contract

```js
import dotenv from 'dotenv'
import { ethers } from 'ethers'

dotenv.config()

const RPC_URL = 'https://rpc-amoy.polygon.technology'
const USDC_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'

const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

console.log('🔑 Sender:', wallet.address)
```

---

## Step 2: Describe the Contract with an ABI

The Application Binary Interface (ABI) tells ethers.js which functions you plan to call.

```js
const USDC_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
]

const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet)
```

> 💡 We only include the fragments we need. PolygonScan hosts the full ABI if you ever require additional functions.

---

## Step 3: Inspect Your USDC Balance

Verify you have tokens to send before initiating a transfer.

```js
const balance = await usdc.balanceOf(wallet.address)
const decimals = await usdc.decimals()

console.log('💵 USDC Balance:', ethers.utils.formatUnits(balance, decimals), 'USDC')
```

`formatUnits` respects custom decimal counts; using `formatEther` here would incorrectly assume 18 decimals.

---

## Step 4: Transfer USDC

ERC20 transfers call the contract directly instead of using `sendTransaction`.

```js
const RECIPIENT = process.env.RECIPIENT
const AMOUNT = '0.01' // Minimal amount for demo

console.log('\n📤 Sending USDC')
console.log('├─ To:', RECIPIENT)
console.log('└─ Amount:', AMOUNT, 'USDC')

const amountInBaseUnits = ethers.utils.parseUnits(AMOUNT, decimals)
const tx = await usdc.transfer(RECIPIENT, amountInBaseUnits)

console.log('\n⏳ Transaction sent:', tx.hash)
const receipt = await tx.wait()

console.log('✅ Confirmed in block:', receipt.blockNumber)
console.log('🔗 View:', `https://amoy.polygonscan.com/tx/${tx.hash}`)
```

Key differences from the POL workflow:

- `usdc.transfer` submits a smart contract call.
- Gas is still charged in POL, not USDC.
- `parseUnits` uses the token's decimal count to avoid over- or under-paying.

---

## Step 5: Reconcile Balances

After confirmation, check that both your USDC and POL balances have changed as expected.

```js
const newBalance = await usdc.balanceOf(wallet.address)
const recipientBalance = await usdc.balanceOf(RECIPIENT)

console.log('\n📊 Updated Balances')
console.log('├─ Your USDC:', ethers.utils.formatUnits(newBalance, decimals))
console.log('└─ Recipient USDC:', ethers.utils.formatUnits(recipientBalance, decimals))

// Check POL was spent on gas
const polBalance = await provider.getBalance(wallet.address)
console.log('\n⛽ Gas paid in POL:', ethers.utils.formatEther(polBalance))
```

You should see:

- Your USDC balance drops by the transfer amount.
- Your POL balance dips slightly from gas costs.
- The recipient's USDC balance increases accordingly.

---

## Gas Costs for ERC20 Transfers

ERC20 transfers invoke smart contract logic, so they use more gas than native transfers:

- Native POL transfer: about 21,000 gas.
- ERC20 transfer: typically 50,000 to 65,000 gas.

Polygon’s low fees mean the difference is small, but it is important to keep in mind on higher-cost networks.

---

## Practice Suggestions

- Try sending different amounts (for example 0.1 USDC or 10 USDC) and confirm the decimals stay accurate.
- Transfer tokens to your own address to see how the transaction appears in the logs.
- Execute several transfers and compare gas usage across each receipt.

---

## Common Pitfalls

❌ Using `parseEther` for USDC will multiply the amount by 10^12 and likely fail or drain your balance.

```js
// WRONG (sends 1,000,000,000,000 USDC)
usdc.transfer(to, ethers.utils.parseEther('1'))

// CORRECT (sends 1 USDC)
usdc.transfer(to, ethers.utils.parseUnits('1', 6))
```

❌ Forgetting to keep POL on hand for gas will cause the transaction to revert.

❌ Skipping the balance check may leave you guessing why a transfer failed.

---

## Wrap-Up

You now know how to:

- ✅ Interact with ERC20 contracts through ethers.js.
- ✅ Send USDC on Polygon Amoy with precise decimal handling.
- ✅ Track both token balances and POL gas consumption.

Next, in Part 6, you will learn how to cover those gas costs on behalf of your users with gasless transactions.
