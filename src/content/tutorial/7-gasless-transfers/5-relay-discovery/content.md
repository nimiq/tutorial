---
type: lesson
title: "Discovering Relays Dynamically"
focus: /index.js
mainCommand: npm run discover
prepareCommands:
  - npm install
terminal:
  open: true
  activePanel: 0
  panels: ['output']
---

# Discovering Relays Dynamically

Hardcoding a relay URL works for demos, but production code needs to discover healthy relays automatically. In this lesson you will query the OpenGSN RelayHub contract, vet the results, and pick a relay that is ready to carry your transaction. The approach mirrors what the Nimiq wallet uses in production.

---

## Objectives

By the end of this lesson you will:
- Query on-chain events with ethers.js.
- Check each relay's advertised metadata and on-chain balances.
- Filter out relays that are offline, outdated, or underfunded.
- Produce a resilient fallback chain when the preferred relay fails.

---

## Step 1: Pull Recent Relay Registrations

RelayHub emits a `RelayServerRegistered` event whenever a relay announces itself. Scan the recent blocks to collect candidates.

```js
const RELAY_HUB_ABI = ['event RelayServerRegistered(address indexed relayManager, uint256 baseRelayFee, uint256 pctRelayFee, string relayUrl)']
const relayHub = new ethers.Contract(RELAY_HUB_ADDRESS, RELAY_HUB_ABI, provider)

const currentBlock = await provider.getBlockNumber()
const LOOKBACK_BLOCKS = 144000 // ~60 hours on Polygon

const events = await relayHub.queryFilter(
  relayHub.filters.RelayServerRegistered(),
  currentBlock - LOOKBACK_BLOCKS,
  currentBlock
)

console.log(`Found ${events.length} relay registrations`)
```

Looking back roughly 60 hours balances freshness with performance. Adjust the window if you need more or fewer candidates.

---

## Step 2: Ping and Validate Each Relay

For every registration, call the `/getaddr` endpoint and run a series of health checks before trusting it.

```js
import axios from 'axios'

async function validateRelay(relayUrl) {
  try {
    const response = await axios.get(`${relayUrl}/getaddr`, { timeout: 10000 })
    const { relayWorkerAddress, ready, version, networkId, minGasPrice } = response.data

    // Check version
    if (!version.startsWith('2.')) return null

    // Check network
    if (networkId !== 137) return null

    // Check worker balance
    const workerBalance = await provider.getBalance(relayWorkerAddress)
    const requiredBalance = ethers.utils.parseEther('0.01') // Minimum threshold
    if (workerBalance.lt(requiredBalance)) return null

    // Check recent activity (skip for Fastspot relays)
    if (!relayUrl.includes('fastspot.io')) {
      const recentTx = await provider.getTransactionCount(relayWorkerAddress)
      // ... validate transaction recency
    }

    return { url: relayUrl, worker: relayWorkerAddress, minGasPrice, ...response.data }
  } catch (error) {
    return null // Relay offline or invalid
  }
}
```

Checks to keep in mind:
- **Version** must start with 2.x to match the OpenGSN v2 protocol.
- **Network ID** should be 137 for Polygon mainnet.
- **Worker balance** needs enough POL to front your transaction (the example uses 0.01 POL as a floor).
- **Recent activity** ensures the worker is still alive and signing transactions.

---

## Step 3: Select the First Healthy Relay

Iterate through the registrations until you find one that passes validation. You can collect alternates for fallback if desired.

```js
for (const event of events) {
  const relay = await validateRelay(event.args.relayUrl)
  if (relay) {
    console.log('✅ Found valid relay:', relay.url)
    // Use this relay for your transaction
    break
  }
}
```

This simple loop already improves reliability dramatically compared to a hardcoded URL.

---

## Why This Beats a Static Relay

- ✅ Automatically skips relays that are offline or misconfigured.  
- ✅ Picks up newly registered relays without code changes.  
- ✅ Gives you hooks to rank relays by price, latency, or trust level.  
- ❌ Still relies on static fee estimates (we will tackle that in the next lesson).  

---

## Wrap-Up

You now have a discovery pipeline that:
- ✅ Queries RelayHub for fresh relay registrations.  
- ✅ Validates each relay's network, version, balance, and responsiveness.  
- ✅ Falls back gracefully when a relay fails health checks.  
- ✅ Removes the last hardcoded relay URL from your workflow.  

Next up: **Lesson 5** where you replace static fees with a dynamic, production-ready calculation.
