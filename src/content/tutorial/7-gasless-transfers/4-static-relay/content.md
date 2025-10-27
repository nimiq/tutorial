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

```bash
POLYGON_RPC_URL=https://polygon-rpc.com
SPONSOR_PRIVATE_KEY=your_mainnet_key_with_USDT
RECEIVER_ADDRESS=0x...
TRANSFER_AMOUNT_USDT=1.0
RELAY_URL=https://polygon-mainnet-relay.nimiq-network.com
```

> ⚠️ **Mainnet required:** you need a mainnet wallet that holds at least 1-2 USDT and a small amount of POL. Acquire funds via your preferred exchange or bridge service.

---

## Step 2: Connect and Define Contract Addresses

```js
import { ethers } from 'ethers'
import dotenv from 'dotenv'
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

---

## Step 3: Retrieve the USDT Nonce and Approval Amount

USDT uses its own permit-style approval. Fetch the current nonce and compute how much the transfer contract is allowed to spend (transfer amount + relay fee).

```js
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

Build the EIP-712 payload and sign it with the sponsor wallet.

```js
const domain = {
  name: 'Tether USD',
  version: '1',
  chainId: 137,
  verifyingContract: USDT_ADDRESS
}

const types = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
}

const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour
const value = {
  owner: wallet.address,
  spender: TRANSFER_CONTRACT_ADDRESS,
  value: approvalAmount,
  nonce,
  deadline
}

const signature = await wallet._signTypedData(domain, types, value)
const { r, s, v } = ethers.utils.splitSignature(signature)

console.log('✍️  Approval signed')
```

This approval allows the transfer contract to pull both the transfer amount and the relay fee from your wallet.

---

## Step 5: Encode the Transfer Call

Prepare the calldata the relay will submit on your behalf.

```js
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

The relay expects a second EIP-712 signature covering the meta-transaction wrapper. Gather the contract nonce and sign the payload.

```js
const transferNonce = await transferContract.getNonce(wallet.address)

const relayRequest = {
  request: {
    from: wallet.address,
    to: TRANSFER_CONTRACT_ADDRESS,
    value: '0',
    gas: '350000',
    nonce: transferNonce.toString(),
    data: transferCalldata,
    validUntilTime: (Math.floor(Date.now() / 1000) + 7200).toString()
  },
  relayData: {
    gasPrice: '100000000000', // 100 gwei (static!)
    pctRelayFee: '0',
    baseRelayFee: '0',
    relayWorker: 'will_be_filled_by_relay',
    paymaster: TRANSFER_CONTRACT_ADDRESS,
    forwarder: '0x...',  //  Trusted Forwarder address
    clientId: '1'
  }
}

// Sign it
const relayDomain = { name: 'GSN Relayed Transaction', version: '2', chainId: 137, verifyingContract: '0x...' }
const relayTypes = { /* RelayRequest types */ }
const relaySignature = await wallet._signTypedData(relayDomain, relayTypes, relayRequest)

console.log('✍️  Relay request signed')
```

---

## Step 7: Submit the Meta-Transaction

Use the OpenGSN HTTP client to send the request to your chosen relay.

```js
import { HttpClient } from '@opengsn/common/dist/HttpClient'

const httpClient = new HttpClient()
const relayResponse = await httpClient.relayTransaction(process.env.RELAY_URL, {
  relayRequest,
  metadata: {
    signature: relaySignature,
    approvalData: '0x',
    relayHubAddress: RELAY_HUB_ADDRESS,
    relayMaxNonce: 999999
  }
})

const txHash = typeof relayResponse === 'string' ? relayResponse : relayResponse.signedTx
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

Continue to **Lesson 4** to discover relays dynamically via RelayHub events.
