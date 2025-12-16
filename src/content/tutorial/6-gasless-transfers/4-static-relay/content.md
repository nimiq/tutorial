---
type: lesson
title: "Gasless with Static Relay"
focus: /index.js
mainCommand: npm run gasless
prepareCommands:
  - npm install
terminal:
  open: true
  activePanel: 0
  panels: ['output']
---

# Gasless with Static Relay

You just measured the cost of a standard USDT transfer. Now we will send the same payment through **OpenGSN**, where a relay covers the POL gas and you reimburse it in USDT. This first iteration keeps everything intentionally simple so you can see each moving part clearly before layering on optimizations in later lessons.

---

## OpenGSN at a Glance

The gasless flow has three stages:

1. You sign a meta-transaction off-chain. No POL is spent yet.
2. A relay server broadcasts that request on-chain and pays the POL gas.
3. Your transfer contract reimburses the relay in USDT (amount plus fee).

Key roles involved:

- **Sponsor (you)** signs messages and funds relay fees in USDT.
- **Relay servers** front the POL gas and expect reimbursement.
- **Transfer contract** executes the token move and fee payment.
- **RelayHub** validates and routes meta-transactions across the network.

If you have never met OpenGSN before, keep this component cheat sheet handy:

- **Forwarder:** verifies the meta-transaction signature and keeps per-sender nonces so relays cannot replay old requests. The Nimiq transfer contract bundles a forwarder implementation; see the reference in the [Nimiq Developer Center](https://www.nimiq.com/developers/).
- **Paymaster:** refunds the relay in tokens such as USDT or USDC. For this tutorial the same transfer contract doubles as paymaster.
- **RelayHub:** the canonical on-chain registry of relays. Its API is documented in the [OpenGSN Docs](https://docs.opengsn.org/).
- **Relay server:** an off-chain service that watches the hub and exposes `/getaddr` plus `/relay` endpoints. Polygon’s networking requirements for relays are outlined in the [Polygon developer documentation](https://docs.polygon.technology/).

---

## Guardrails for This Lesson

To keep the walkthrough approachable we will:

- Hardcode a known relay URL instead of discovering one dynamically.
- Use a static relay fee (0.1 USDT) and a fixed gas price.
- Work entirely on Polygon mainnet because OpenGSN is not deployed on Amoy.

Later lessons will replace each shortcut with production logic.

---

## Step 1: Configure Environment Variables

Create or update your `.env` file with the following values:

```bash title=".env"
POLYGON_RPC_URL=https://polygon-rpc.com
SPONSOR_PRIVATE_KEY=your_mainnet_key_with_USDT
RECEIVER_ADDRESS=0x...
TRANSFER_AMOUNT_USDT=1.0
RELAY_URL=https://polygon-relay.fastspot.io
```

> ⚠️ **Mainnet required:** you need a mainnet wallet that holds at least 1-2 USDT and a small amount of POL. Acquire funds via your preferred exchange or bridge service.

---

## Step 2: Connect and Define Contract Addresses

```js title="index.js" showLineNumbers mark=6-13
import dotenv from 'dotenv'
import { ethers } from 'ethers'

dotenv.config()

const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL)
const wallet = new ethers.Wallet(process.env.SPONSOR_PRIVATE_KEY, provider)

// Contract addresses (Polygon mainnet)
const USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
const TRANSFER_CONTRACT_ADDRESS = '0x...' // Nimiq's transfer contract
const RELAY_HUB_ADDRESS = '0x...' // OpenGSN RelayHub

console.log('🔑 Sponsor:', wallet.address)
```

The sponsor wallet is the account that will sign messages and reimburse the relay.
The concrete contract addresses are documented in the [Nimiq Developer Center](https://developers.nimiq.com/). Always verify them against the latest deployment notes before running on mainnet.

---

## Step 3: Retrieve the USDT Nonce and Approval Amount

USDT on Polygon does _not_ implement the standard ERC‑2612 permit. Instead it exposes `executeMetaTransaction`, which expects you to sign the encoded `approve` call. The `nonces` counter you query below is USDT’s own meta-transaction nonce (documented in [Tether’s contract implementation](https://docs.opengsn.org/contracts/erc-2771.html)), so we can safely reuse it when we sign the approval.

Fetch the current nonce and compute how much the transfer contract is allowed to spend (transfer amount + relay fee).

```js title="index.js" showLineNumbers mark=3-9
const USDT_ABI = ['function nonces(address owner) view returns (uint256)']
const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider)

const nonce = await usdt.nonces(wallet.address)
console.log('📝 USDT Nonce:', nonce.toString())

// Calculate amounts
const amountToSend = ethers.utils.parseUnits(process.env.TRANSFER_AMOUNT_USDT, 6)
const staticFee = ethers.utils.parseUnits('0.1', 6) // 0.1 USDT fee (static!)
const approvalAmount = amountToSend.add(staticFee)
```

---

## Step 4: Sign the USDT Meta-Approval

USDT on Polygon uses `executeMetaTransaction` for gasless approvals. Build the EIP‑712 MetaTransaction payload and sign it. Notice the domain uses the `salt` field instead of `chainId`; that is specific to the USDT contract. Compare this to the generic permit flow covered in [OpenGSN’s meta-transaction docs](https://docs.opengsn.org/gsn-provider/metatx.html) to see the differences.

```js title="index.js" showLineNumbers mark=9-19
// First, encode the approve function call
const approveFunctionSignature = usdt.interface.encodeFunctionData('approve', [
  TRANSFER_CONTRACT_ADDRESS,
  approvalAmount
])

// Build the MetaTransaction EIP-712 domain
const domain = {
  name: 'USDT0',
  version: '1',
  verifyingContract: USDT_ADDRESS,
  salt: ethers.utils.hexZeroPad(ethers.utils.hexlify(137), 32) // chainId as salt
}

const types = {
  MetaTransaction: [
    { name: 'nonce', type: 'uint256' },
    { name: 'from', type: 'address' },
    { name: 'functionSignature', type: 'bytes' }
  ]
}

const message = {
  nonce: nonce.toNumber(),
  from: wallet.address,
  functionSignature: approveFunctionSignature
}

const signature = await wallet._signTypedData(domain, types, message)
const { r, s, v } = ethers.utils.splitSignature(signature)

console.log('✍️  USDT approval signed')
```

This signature allows the relay to execute the `approve` call on your behalf via `executeMetaTransaction`.

---

## Step 5: Encode the Transfer Call

Prepare the calldata the relay will submit on your behalf.

```js title="index.js" showLineNumbers mark=6-14
const TRANSFER_ABI = ['function transferWithApproval(address token, uint256 amount, address to, uint256 fee, uint256 approval, bytes32 r, bytes32 s, uint8 v)']
const transferContract = new ethers.Contract(TRANSFER_CONTRACT_ADDRESS, TRANSFER_ABI, wallet)

const transferCalldata = transferContract.interface.encodeFunctionData('transferWithApproval', [
  USDT_ADDRESS,
  amountToSend,
  process.env.RECEIVER_ADDRESS,
  staticFee,
  approvalAmount,
  r,
  s,
  v
])

console.log('📦 Calldata encoded')
```

---

## Step 6: Build and Sign the Relay Request

The relay expects a second EIP‑712 signature covering the meta-transaction wrapper. This time the domain is the **forwarder** (embedded inside the transfer contract). Gather the contract nonce and sign the payload.

```js title="index.js" showLineNumbers mark=6-21
const transferNonce = await transferContract.getNonce(wallet.address)

const relayRequest = {
  request: {
    from: wallet.address,
    to: TRANSFER_CONTRACT_ADDRESS,
    value: '0',
    gas: '350000',
    nonce: transferNonce.toString(),
    data: transferCalldata,
    validUntil: (Math.floor(Date.now() / 1000) + 7200).toString()
  },
  relayData: {
    gasPrice: '100000000000', // 100 gwei (static!)
    pctRelayFee: '0',
    baseRelayFee: '0',
    relayWorker: '0x0000000000000000000000000000000000000000', // Will be filled by relay
    paymaster: TRANSFER_CONTRACT_ADDRESS,
    forwarder: TRANSFER_CONTRACT_ADDRESS,
    paymasterData: '0x',
    clientId: '1'
  }
}

// Sign it
const relayDomain = { name: 'GSN Relayed Transaction', version: '2', chainId: 137, verifyingContract: TRANSFER_CONTRACT_ADDRESS }
const relayTypes = { /* RelayRequest types – see docs.opengsn.org for the full schema */ }
const relaySignature = await wallet._signTypedData(relayDomain, relayTypes, relayRequest)

console.log('✍️  Relay request signed')
```

---

## Step 7: Submit the Meta-Transaction

Use the OpenGSN HTTP client to send the request to your chosen relay. The worker nonce check prevents you from handing the relay a `relayMaxNonce` that is already stale — if the worker broadcasts several transactions in quick succession, your request will still slide in. Likewise, `validUntil` in the previous step protects the relay from signing requests that could be replayed months later.

```js title="index.js" showLineNumbers mark=1-18
import { HttpClient, HttpWrapper } from '@opengsn/common'

const relayNonce = await provider.getTransactionCount(relayInfo.relayWorkerAddress)

const httpClient = new HttpClient(new HttpWrapper(), console)
const relayResponse = await httpClient.relayTransaction(RELAY_URL, {
  relayRequest,
  metadata: {
    signature: relaySignature,
    approvalData: '0x',
    relayHubAddress: RELAY_HUB_ADDRESS,
    relayMaxNonce: relayNonce + 3
  }
})

const txHash = typeof relayResponse === 'string'
  ? relayResponse
  : relayResponse.signedTx || relayResponse.txHash

console.log('\n✅ Gasless transaction sent!')
console.log('🔗 View:', `https://polygonscan.com/tx/${txHash}`)
```

---

## Recap: What Just Happened

1. You signed a USDT meta-approval without spending gas.
2. You signed a meta-transaction request for the relay.
3. The relay paid POL to submit the transaction on-chain.
4. The receiver received USDT minus the 0.1 USDT relay fee.
5. Your wallet retained its POL balance.

---

## Limitations to Keep in Mind

- ❌ Hardcoded relay URL (no fallback if it goes offline).
- ❌ Static fee and gas price (no adaptation to network conditions).
- ❌ No validation of relay health beyond a single request.

The next lessons address each of these gaps.

---

## Wrap-Up

You have now:

- ✅ Sent USDT without paying POL yourself.
- ✅ Practiced constructing and signing OpenGSN meta-transactions.
- ✅ Understood the flow between approval, relay request, and paymaster contract.
- ✅ Prepared the foundation for relay discovery and fee optimization.

Next up, **Discovering Relays Dynamically** walks through discovering relays from RelayHub and filtering them with health checks informed by the [OpenGSN relay operator guide](https://docs.opengsn.org/relay/). That will let you replace today’s hardcoded URL with resilient discovery logic.
