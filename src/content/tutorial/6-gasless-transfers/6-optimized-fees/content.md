---
type: lesson
title: "Optimized Fee Calculation"
focus: /index.js
mainCommand: npm run optimized
prepareCommands:
  - npm install
terminal:
  open: true
  activePanel: 0
  panels: ['output']
---

# Optimized Fee Calculation

Hardcoding relay fees works for prototypes, but production systems need to adapt to market conditions in real time. In this lesson you will calculate the exact fee a relay should receive based on live gas prices, relay-specific pricing, and protective buffers - mirroring the logic in the Nimiq wallet.

---

## Learning Goals

- Fetch the current network gas price and respect the relay's minimum.
- Apply context-aware buffers that keep transactions reliable without overspending.
- Combine relay percentage fees and base fees into a single POL amount.
- Convert that POL cost into USDT using conservative pricing assumptions.
- Compare multiple relays and pick the most cost-effective option.

The maths mirrors the `calculateGaslessFee` helper inside `@cashlink/currency/src/gasless/fees.ts`. Cross-reference it with the [OpenGSN fee model documentation](https://docs.opengsn.org/relay/relay-lifecycle.html#fees) and the [Nimiq wallet engineering notes](https://developers.nimiq.com/) if you want to see the production lineage.

---

## The Core Formula

```text title="Fee formula"
chainTokenFee = (gasPrice * gasLimit * (1 + pctRelayFee/100)) + baseRelayFee
usdtFee = (chainTokenFee / usdtPriceInPOL) * safetyBuffer
```

Where:

- `gasPrice` is the higher of the network price and the relay's minimum, optionally buffered.
- `gasLimit` depends on the method you are executing.
- `pctRelayFee` and `baseRelayFee` come from the relay registration event.
- `safetyBuffer` adds wiggle room (typically 10-50%).
- `usdtPriceInPOL` converts the POL cost into USDT.

---

## Step 1: Read the Network Gas Price

```js title="gas-price.ts" showLineNumbers mark=1-8
const networkGasPrice = await provider.getGasPrice()
console.log('Network gas price:', ethers.utils.formatUnits(networkGasPrice, 'gwei'), 'gwei')

// Get relay's minimum
const relay = await discoverRelay() // From lesson 3
const minGasPrice = ethers.BigNumber.from(relay.minGasPrice)

// Take the max
const gasPrice = networkGasPrice.gt(minGasPrice) ? networkGasPrice : minGasPrice
```

Using the maximum of the two ensures you never pay less than the relay requires, while still benefiting from low network prices when possible.

Why the **min gas price** matters: each relay advertises a floor in its `/getaddr` response. If you submit a transaction below that price the worker will reject it. The [Polygon gas market guide](https://docs.polygon.technology/docs/develop/network-details/gas/) explains why congestion spikes make this floor fluctuate.

---

## Step 2: Apply a Safety Buffer

Different workflows tolerate risk differently. Adjust the buffer based on the method or environment you are in.

```js title="buffer.ts" showLineNumbers mark=1-13
const ENV_MAIN = true // Set based on environment

let bufferPercentage
if (method === 'redeemWithSecretInData') {
  bufferPercentage = 150 // 50% buffer (swap fee volatility)
}
else if (ENV_MAIN) {
  bufferPercentage = 110 // 10% buffer (mainnet)
}
else {
  bufferPercentage = 125 // 25% buffer (testnet, more volatile)
}

const bufferedGasPrice = gasPrice.mul(bufferPercentage).div(100)
console.log('Buffered gas price:', ethers.utils.formatUnits(bufferedGasPrice, 'gwei'), 'gwei')
```

---

## Step 3: Combine Gas Costs and Relay Fees

```js title="fee-components.ts" showLineNumbers mark=1-18
// Method-specific gas limits (from wallet implementation)
const GAS_LIMITS = {
  transfer: 65000,
  transferWithPermit: 72000,
  transferWithApproval: 72000,
  swapWithApproval: 85000
}

const method = 'transferWithApproval'
const gasLimit = GAS_LIMITS[method]

// Calculate base cost
const baseCost = bufferedGasPrice.mul(gasLimit)

// Add relay percentage fee
const pctRelayFee = 15 // From relay registration (e.g., 15%)
const costWithPct = baseCost.mul(100 + pctRelayFee).div(100)

// Add base relay fee
const baseRelayFee = ethers.BigNumber.from(relay.baseRelayFee)
const totalChainTokenFee = costWithPct.add(baseRelayFee)

console.log('Total POL cost:', ethers.utils.formatEther(totalChainTokenFee))
```

This yields the amount of POL the relay expects to receive after covering gas.

---

## Step 4: Convert POL Cost to USDT

```js title="fee-to-usdt.ts" showLineNumbers mark=1-11
// Option 1: Hardcoded conservative rate
const POL_PRICE_USD = 0.50 // $0.50 per POL (check current market)
const USDT_DECIMALS = 6

const feeInUSD = Number.parseFloat(ethers.utils.formatEther(totalChainTokenFee)) * POL_PRICE_USD
const feeInUSDT = ethers.utils.parseUnits((feeInUSD * 1.10).toFixed(6), USDT_DECIMALS) // 10% buffer

console.log('USDT fee:', ethers.utils.formatUnits(feeInUSDT, USDT_DECIMALS))

// Option 2: Fetch from Uniswap pool (advanced)
// const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider)
// const price = await pool.slot0() // Get current price from pool
```

Start with a conservative fixed price, then graduate to on-chain oracles once you are ready.

In production we look up the POL/USDT price using Uniswap's Quoter contract and then apply an extra 10-15% margin as insurance. That keeps the relay from being underpaid even if POL appreciates between fee estimation and transaction confirmation.

---

## Step 5: Reject Expensive Relays

```js title="guardrails.ts" showLineNumbers mark=1-9
const MAX_PCT_RELAY_FEE = 70 // Never accept >70%
const MAX_BASE_RELAY_FEE = 0 // Never accept base fee

if (pctRelayFee > MAX_PCT_RELAY_FEE) {
  throw new Error(`Relay fee too high: ${pctRelayFee}%`)
}

if (baseRelayFee.gt(MAX_BASE_RELAY_FEE)) {
  throw new Error('Relay base fee not acceptable')
}
```

These guardrails prevent accidental overpayment when a relay is misconfigured or opportunistic.

---

## Step 6: Choose the Best Relay

```js title="choose-relay.ts" showLineNumbers mark=1-17
async function getBestRelay(relays, gasLimit, method) {
  let bestRelay = null
  let lowestFee = ethers.constants.MaxUint256

  for (const relay of relays) {
    try {
      const fee = await calculateFee(relay, gasLimit, method)
      if (fee.lt(lowestFee)) {
        lowestFee = fee
        bestRelay = relay
      }
    }
    catch (error) {
      continue // Skip invalid relays
    }
  }

  return bestRelay
}
```

When you have multiple candidates, this loop compares their fees and picks the cheapest valid option.

Want more than “cheapest wins”? It is common to score relays on latency, historical success rate, or geographic proximity. The [OpenGSN Relay Operator checklist](https://docs.opengsn.org/relay/relay-operator.html) lists the metrics most teams monitor.

---

## Production Considerations

These extras come straight from the Nimiq wallet codebase:

1. **Timeout relay requests after two seconds** to avoid hanging the UI.
2. **Cap the number of relays you test** (for example, at 10) to keep discovery fast.
3. **Require worker balances at least twice the expected gas cost** for safety.
4. **Skip inactive relays** unless they belong to trusted providers such as Fastspot.
5. **Use generators or iterators** so you can stop searching the moment a good relay appears.

---

## Putting It All Together

```js title="calculate-optimal-fee.ts" showLineNumbers mark=1-18
async function calculateOptimalFee(method, relay) {
  // 1. Get gas prices
  const networkGasPrice = await provider.getGasPrice()
  const gasPrice = getBufferedGasPrice(networkGasPrice, relay.minGasPrice, method)

  // 2. Get gas limit
  const gasLimit = GAS_LIMITS[method]

  // 3. Calculate chain token fee
  const baseCost = gasPrice.mul(gasLimit)
  const withPctFee = baseCost.mul(100 + relay.pctRelayFee).div(100)
  const totalPOL = withPctFee.add(relay.baseRelayFee)

  // 4. Convert to USDT with buffer
  const usdtFee = await convertPOLtoUSDT(totalPOL, 1.10) // 10% buffer

  return { usdtFee, gasPrice, gasLimit }
}
```

Reuse this helper whenever you prepare a meta-transaction so each request reflects current network conditions.

---

## Wrap-Up

You now have a production-grade fee engine that:

- ✅ Tracks live gas prices and relay minimums.
- ✅ Applies thoughtful buffers to avoid underpayment.
- ✅ Converts POL costs into USDT predictably.
- ✅ Compares relays and selects the most cost-effective option.

At this point your gasless transaction pipeline matches the approach we ship in the Nimiq wallet - ready for real users. From here you can integrate oracles, caching layers, and monitoring to keep everything running smoothly.
Continue with the [Nimiq Developer Center](https://developers.nimiq.com/) recipes to embed the finished fee engine in your dApp UI.
