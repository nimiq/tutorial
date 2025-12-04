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

Hardcoding relay fees works for prototypes, but production systems need to adapt to market conditions in real time. In this lesson you will calculate the exact fee a relay should receive based on live gas prices, relay-specific pricing, and protective buffers — mirroring the logic in the Nimiq wallet.

---

## Learning Goals

- Fetch the current network gas price and respect the relay's minimum.
- Apply context-aware buffers that keep transactions reliable without overspending.
- Combine relay percentage fees and base fees into a single POL amount.
- Convert that POL cost into USDT using conservative pricing assumptions.
- Compare multiple relays and pick the most cost-effective option.

The math mirrors the `calculateGaslessFee` helper inside `@cashlink/currency/src/gasless/fees.ts`. Cross-reference it with the [OpenGSN fee model documentation](https://docs.opengsn.org/relay/relay-lifecycle.html#fees) and the [Nimiq wallet engineering notes](https://developers.nimiq.com/) if you want to see the production lineage.

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

// Get relay's minimum (from the relay discovery lesson)
const relay = await discoverRelay()
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

## Step 3: Get Gas Limit from Transfer Contract

Instead of hardcoding gas limits, query the transfer contract directly:

```js title="gas-limit.ts" showLineNumbers mark=1-11
const TRANSFER_CONTRACT_ABI = [
  'function getRequiredRelayGas(bytes4 methodId) view returns (uint256)'
]

const transferContract = new ethers.Contract(
  TRANSFER_CONTRACT_ADDRESS,
  TRANSFER_CONTRACT_ABI,
  provider
)

// Method selector for transferWithApproval
const METHOD_SELECTOR = '0x8d89149b'
const gasLimit = await transferContract.getRequiredRelayGas(METHOD_SELECTOR)

console.log('Gas limit:', gasLimit.toString())
```

This ensures your gas estimates stay accurate even if the contract changes.

---

## Step 4: Combine Gas Costs and Relay Fees

```js title="fee-components.ts" showLineNumbers mark=1-14
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

## Step 5: Get Real-Time POL/USDT Price from Uniswap

Query Uniswap V3 for the current exchange rate:

```js title="uniswap-price.ts" showLineNumbers mark=1-21
const UNISWAP_QUOTER = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
const WMATIC = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
const USDT_WMATIC_POOL = '0x9B08288C3Be4F62bbf8d1C20Ac9C5e6f9467d8B7'

const POOL_ABI = ['function fee() external view returns (uint24)']
const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
]

async function getPolUsdtPrice(provider) {
  const pool = new ethers.Contract(USDT_WMATIC_POOL, POOL_ABI, provider)
  const quoter = new ethers.Contract(UNISWAP_QUOTER, QUOTER_ABI, provider)

  const fee = await pool.fee()

  // Quote: How much POL for 1 USDT?
  const polPerUsdt = await quoter.callStatic.quoteExactInputSingle(
    USDT_ADDRESS,
    WMATIC,
    fee,
    ethers.utils.parseUnits('1', 6),
    0
  )

  return polPerUsdt // POL wei per 1 USDT
}
```

---

## Step 6: Convert POL Cost to USDT

```js title="fee-to-usdt.ts" showLineNumbers mark=1-8
const polPerUsdt = await getPolUsdtPrice(provider)

// Convert: totalPOLCost / polPerUsdt = USDT units
// Apply 10% buffer for safety
const feeInUSDT = totalChainTokenFee
  .mul(1_000_000)
  .div(polPerUsdt)
  .mul(110)
  .div(100)

console.log('USDT fee:', ethers.utils.formatUnits(feeInUSDT, 6))
```

Using Uniswap ensures your fees reflect current market rates, preventing underpayment when POL appreciates.

---

## Step 7: Reject Expensive Relays

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

## Step 8: Choose the Best Relay

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

```js title="calculate-optimal-fee.ts" showLineNumbers mark=1-21
async function calculateOptimalFee(relay, provider, transferContract) {
  // 1. Get gas prices
  const networkGasPrice = await provider.getGasPrice()
  const baseGasPrice = networkGasPrice.gt(relay.minGasPrice)
    ? networkGasPrice
    : relay.minGasPrice

  // 2. Apply buffer
  const bufferedGasPrice = baseGasPrice.mul(110).div(100) // 10% mainnet

  // 3. Get gas limit from contract
  const gasLimit = await transferContract.getRequiredRelayGas('0x8d89149b')

  // 4. Calculate POL fee
  const baseCost = bufferedGasPrice.mul(gasLimit)
  const withPctFee = baseCost.mul(100 + relay.pctRelayFee).div(100)
  const totalPOL = withPctFee.add(relay.baseRelayFee)

  // 5. Convert to USDT via Uniswap
  const polPerUsdt = await getPolUsdtPrice(provider)
  const usdtFee = totalPOL.mul(1_000_000).div(polPerUsdt).mul(110).div(100)

  return { usdtFee, gasPrice: bufferedGasPrice, gasLimit }
}
```

Reuse this helper whenever you prepare a meta-transaction so each request reflects current network conditions.

---

## Wrap-Up

You now have a production-grade fee engine that:

- ✅ Tracks live gas prices and relay minimums.
- ✅ Queries contract for accurate gas limits.
- ✅ Uses Uniswap V3 for real-time POL/USDT rates.
- ✅ Applies thoughtful buffers to avoid underpayment.
- ✅ Compares relays and selects the most cost-effective option.

At this point your gasless transaction pipeline matches the approach we ship in the Nimiq wallet - ready for real users. The next lesson covers USDC transfers using the EIP-2612 permit approval method, showing how different tokens require different approval strategies.
