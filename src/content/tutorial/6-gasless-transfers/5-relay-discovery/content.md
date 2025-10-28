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

Before you start, skim the reference material so the field names feel familiar:

- [RelayHub events in the OpenGSN docs](https://docs.opengsn.org/contracts/relay-hub.html).
- Nimiq’s [gasless transfer architecture notes](https://developers.nimiq.com/).
- Polygon’s [gasless transaction guidelines](https://docs.polygon.technology/).

---

## Step 1: Pull Recent Relay Registrations

RelayHub emits a `RelayServerRegistered` event whenever a relay announces itself. Scan the recent blocks to collect candidates.

```js title="discover-relays.ts" showLineNumbers mark=6-24
const RELAY_HUB_ABI = ['event RelayServerRegistered(address indexed relayManager, uint256 baseRelayFee, uint256 pctRelayFee, string relayUrl)']
const relayHub = new ethers.Contract(RELAY_HUB_ADDRESS, RELAY_HUB_ABI, provider)

const currentBlock = await provider.getBlockNumber()
const LOOKBACK_BLOCKS = 14400 // ~10 hours on Polygon

const events = await relayHub.queryFilter(
  relayHub.filters.RelayServerRegistered(),
  currentBlock - LOOKBACK_BLOCKS,
  currentBlock
)

const seen = new Map()

for (const event of events) {
  const { relayManager, baseRelayFee, pctRelayFee, relayUrl } = event.args
  if (!seen.has(relayUrl)) {
    seen.set(relayUrl, {
      url: relayUrl,
      relayManager,
      baseRelayFee,
      pctRelayFee,
    })
  }
}

const candidates = Array.from(seen.values())
console.log(`Found ${candidates.length} unique relay URLs`)
```

Looking back roughly 10 hours balances freshness with performance. Adjust the window if you need more or fewer candidates.

---

## Step 2: Ping and Validate Each Relay

For every registration, call the `/getaddr` endpoint and run a series of health checks before trusting it.

```js title="validate-relay.ts" showLineNumbers mark=6-29
async function validateRelay(relay, provider) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(`${relay.url}/getaddr`, { signal: controller.signal })

    clearTimeout(timeout)

    if (!response.ok)
      return null

    const relayInfo = await response.json()

    if (!relayInfo.version?.startsWith('2.'))
      return null
    if (relayInfo.networkId !== '137' && relayInfo.chainId !== '137')
      return null
    if (!relayInfo.ready)
      return null

    const workerBalance = await provider.getBalance(relayInfo.relayWorkerAddress)
    if (workerBalance.lt(ethers.utils.parseEther('0.01')))
      return null

    const pctFee = Number.parseInt(relay.pctRelayFee)
    const baseFee = ethers.BigNumber.from(relay.baseRelayFee)

    if (pctFee > 70 || baseFee.gt(0))
      return null

    return {
      ...relay,
      relayWorkerAddress: relayInfo.relayWorkerAddress,
      minGasPrice: relayInfo.minGasPrice,
      version: relayInfo.version,
    }
  }
  catch (error) {
    return null // Relay offline or invalid
  }
}
```

`AbortController` gives us a portable timeout without extra dependencies, which keeps the sample compatible with both Node.js scripts and browser bundlers.

Checks to keep in mind:

- **Version** must start with 2.x to match the OpenGSN v2 protocol.
- **Network ID** should be 137 for Polygon mainnet.
- **Worker balance** needs enough POL to front your transaction (the example uses 0.01 POL as a floor).
- **Readiness flag** confirms the relay advertises itself as accepting requests.
- **Fee caps** ensure you never accept a base fee or a percentage beyond your policy.

---

## Step 3: Select the First Healthy Relay

Iterate through the registrations until you find one that passes validation. You can collect alternates for fallback if desired.

```js title="find-best-relay.ts" showLineNumbers mark=3-14
async function findBestRelay(provider) {
  console.log('\n🔬 Validating relays...')

  for (const relay of candidates) {
    const validRelay = await validateRelay(relay, provider)
    if (validRelay)
      return validRelay
  }

  throw new Error('No valid relays found')
}

const relay = await findBestRelay(provider)
console.log('✅ Using relay:', relay.url)
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
