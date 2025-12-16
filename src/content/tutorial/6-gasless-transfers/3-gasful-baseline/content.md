---
type: lesson
title: "Polygon USDT: The Gasful Baseline"
focus: /index.js
mainCommand: npm run send
prepareCommands:
  - npm install
terminal:
  open: true
  activePanel: 0
  panels: ['output']
---

# Polygon USDT: The Gasful Baseline

Before we can appreciate gasless transfers, we need to measure the baseline cost. This lesson connects to Polygon mainnet, records your POL (formerly MATIC) and USDT balances, and sends a standard ERC20 transfer that pays gas in POL. We will reuse the same credentials when we add OpenGSN in the next lesson, so keep them handy.

---

## Learning Goals

By the end of this lesson you will:

- Connect to Polygon mainnet with a funded wallet.
- Measure POL and USDT balances before and after a transfer.
- Send a baseline USDT ERC20 transfer that pays gas in POL.
- Capture the transaction receipt and explorer link for later comparison.

---

## Step 1: Configure the Environment

Copy `.env.example` to `.env`. The template includes a classroom key for demos, but you should replace or top it up with funds you control. Update the following variables:

- `POLYGON_RPC_URL` - HTTPS endpoint for Polygon mainnet (Alchemy in the template).
- `SENDER_PRIVATE_KEY` - Mainnet wallet that holds both POL and USDT.
- `RECEIVER_ADDRESS` - Destination wallet you want to pay.

> ⚠️ **Bring your own funds.** The shared key is public knowledge and might be empty when you attempt this tutorial. Make sure the sender wallet has a little POL for gas (0.01 is enough) and a few USDT before you proceed.

---

## Step 2: Connect to Polygon

Open `index.js` and wire up the provider:

```js
const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL)
```

Then load the funded wallet and attach it to the provider so future contract calls are signed automatically:

```js
const wallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider)
```

Log both addresses to confirm the values pulled from `.env` are the ones you expect.

---

## Step 3: Measure Balances Before Sending

Check your native POL balance and both USDT balances (sender and receiver). The token address and ABI are already exported from `lib/constants.js`:

```js
const usdt = new ethers.Contract(POLYGON_CONFIG.usdtTokenAddress, USDT_ABI, wallet)
const senderUsdtBefore = await usdt.balanceOf(wallet.address)
const receiverUsdtBefore = await usdt.balanceOf(RECEIVER_ADDRESS)
```

Use the helper `formatUsdt` to print readable values. This snapshot will highlight the gas spend and transfer amount later on.

---

## Step 4: Send the Baseline Transfer

Translate the human-readable amount from `.env` into base units, submit the transfer, and wait for the receipt:

```js
const amountBaseUnits = ethers.utils.parseUnits(TRANSFER_AMOUNT_USDT, USDT_DECIMALS)
const transferTx = await usdt.transfer(RECEIVER_ADDRESS, amountBaseUnits)
const receipt = await transferTx.wait()
```

Print the PolygonScan link using `POLYGON_CONFIG.explorerBaseUrl`, then re-query the balances so the before-and-after values are obvious.

Finally, run the script with `npm run send`. You should see the sender's POL balance drop slightly in addition to the USDT transfer. That gas cost is exactly what we will remove in the gasless version.
