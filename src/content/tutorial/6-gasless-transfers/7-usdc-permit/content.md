---
type: lesson
title: "USDC with EIP-2612 Permit"
focus: /index.js
mainCommand: npm run usdc
prepareCommands:
  - npm install
terminal:
  open: true
  activePanel: 0
  panels: ['output']
---

# USDC with EIP-2612 Permit

In Lesson 6 you built gasless USDT transfers using meta-transactions. USDC uses a different approval method called **EIP-2612 Permit** - a standardized way to approve token spending with signatures. This lesson shows how to adapt your gasless pipeline for USDC.

---

## Learning Goals

- Understand EIP-2612 Permit vs meta-transaction approvals
- Sign permit messages with version-based domain separators
- Use `transferWithPermit` instead of `transferWithApproval`
- Adapt fee calculation for USDC-specific parameters

The core flow stays the same: discover relays, calculate fees, sign approval, submit to relay. Only the approval signature changes.

---

## EIP-2612 Permit vs Meta-Transaction

### USDT Meta-Transaction (Lesson 6)
```js
// Salt-based domain separator
const domain = {
  name: 'USDT0',
  version: '1',
  verifyingContract: USDT_ADDRESS,
  salt: ethers.utils.hexZeroPad(ethers.utils.hexlify(137), 32), // ⚠️ Salt, not chainId
}

const types = {
  MetaTransaction: [
    { name: 'nonce', type: 'uint256' },
    { name: 'from', type: 'address' },
    { name: 'functionSignature', type: 'bytes' }, // ⚠️ Encoded function call
  ],
}
```

### USDC Permit (This Lesson)
```js
// Version-based domain separator (EIP-2612 standard)
const domain = {
  name: 'USD Coin',
  version: '2',
  chainId: 137, // ✅ Standard chainId
  verifyingContract: USDC_ADDRESS,
}

const types = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }, // ✅ Deadline, not functionSignature
  ],
}
```

---

## Key Differences

| Aspect | USDT Meta-Transaction | USDC Permit (EIP-2612) |
|--------|----------------------|------------------------|
| **Standard** | Custom implementation | EIP-2612 standard |
| **Domain separator** | `salt` (chain-specific) | `version` + `chainId` |
| **Message struct** | `MetaTransaction` | `Permit` |
| **Approval encoding** | `functionSignature` (bytes) | Separate parameters |
| **Expiry** | No deadline | `deadline` parameter |
| **Transfer method** | `transferWithApproval` | `transferWithPermit` |
| **Method selector** | `0x8d89149b` | `0x36efd16f` |

---

## Step 1: Update Contract Addresses

```js title="usdc-config.js" showLineNumbers mark=1-5
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
const TRANSFER_CONTRACT_ADDRESS = '0x3157d422cd1be13AC4a7cb00957ed717e648DFf2'
const USDC_WMATIC_POOL = '0xA374094527e1673A86dE625aa59517c5dE346d32'

const METHOD_SELECTOR_TRANSFER_WITH_PERMIT = '0x36efd16f'
```

USDC uses a different transfer contract and Uniswap pool than USDT. The method selector also changes.

---

## Step 2: Sign EIP-2612 Permit

```js title="permit-signature.js" showLineNumbers mark=1-29
const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
const usdcNonce = await usdc.nonces(wallet.address)

const transferAmount = ethers.utils.parseUnits('0.01', 6)
const feeAmount = relay.feeData.usdcFee
const approvalAmount = transferAmount.add(feeAmount)

// EIP-2612 domain
const domain = {
  name: 'USD Coin',
  version: '2',
  chainId: 137,
  verifyingContract: USDC_ADDRESS,
}

// EIP-2612 Permit struct
const types = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
}

const message = {
  owner: wallet.address,
  spender: TRANSFER_CONTRACT_ADDRESS,
  value: approvalAmount,
  nonce: usdcNonce.toNumber(),
  deadline: ethers.constants.MaxUint256, // ✅ Infinite deadline
}

const signature = await wallet._signTypedData(domain, types, message)
const { r, s, v } = ethers.utils.splitSignature(signature)
```

---

## Step 3: Build transferWithPermit Call

```js title="transfer-calldata.js" showLineNumbers mark=1-9
const transferContract = new ethers.Contract(
  TRANSFER_CONTRACT_ADDRESS,
  TRANSFER_ABI,
  provider
)

const transferCalldata = transferContract.interface.encodeFunctionData('transferWithPermit', [
  USDC_ADDRESS,       // token
  transferAmount,     // amount
  RECEIVER_ADDRESS,   // target
  feeAmount,          // fee
  deadline,           // deadline ⚠️ New parameter
  r,                  // sigR
  s,                  // sigS
  v,                  // sigV
])
```

Notice the `deadline` parameter - this replaces USDT's `approval` parameter (which was the approval amount).

---

## Step 4: Update Fee Calculation

```js title="usdc-fees.js" showLineNumbers mark=1-11
// Use USDC-specific method selector
const METHOD_SELECTOR = '0x36efd16f' // transferWithPermit

const gasLimit = await transferContract.getRequiredRelayGas(METHOD_SELECTOR)

// Use USDC/WMATIC Uniswap pool
const USDC_WMATIC_POOL = '0xA374094527e1673A86dE625aa59517c5dE346d32'

const polPerUsdc = await getPolUsdcPrice(provider) // Query USDC pool
const feeInUSDC = totalPOLCost.mul(1_000_000).div(polPerUsdc).mul(110).div(100)
```

The gas limit for `transferWithPermit` is typically the same as `transferWithApproval` (~72,000), but query the contract to be sure.

---

## Step 5: Rest of Flow Stays the Same

After building the transfer calldata, the rest is identical to Lesson 6:

1. Get forwarder nonce from transfer contract
2. Build OpenGSN `ForwardRequest`
3. Sign ForwardRequest with EIP-712
4. Submit to relay via `HttpClient`
5. Broadcast transaction

---

## ABI Changes

```js title="usdc-abi.js" showLineNumbers mark=1-5
const TRANSFER_ABI = [
  // Changed from transferWithApproval
  'function transferWithPermit(address token, uint256 amount, address target, uint256 fee, uint256 deadline, bytes32 sigR, bytes32 sigS, uint8 sigV)',
  'function getNonce(address) view returns (uint256)',
  'function getRequiredRelayGas(bytes4 methodId) view returns (uint256)',
]
```

---

## Why Two Approval Methods?

**USDT** (pre-EIP-2612 era):
- Custom meta-transaction implementation
- Salt-based domain separator
- Encodes full function call in signature

**USDC** (EIP-2612 compliant):
- Standardized permit interface
- Version + chainId domain separator
- Simpler parameter structure

Most modern tokens (DAI, USDC, WBTC on some chains) support EIP-2612. Older tokens like USDT use custom approaches.

---

## Production Considerations

1. **Check token support**: Not all ERC20s have permit. Fallback to standard `approve()` + `transferFrom()` if needed.
2. **Deadline vs MaxUint256**: Production systems often use block-based deadlines (e.g., `currentBlock + 100`) for tighter security.
3. **Domain parameters**: Always verify `name` and `version` match the token contract - wrong values = invalid signature.
4. **Method selector lookup**: Store selectors in config per token to avoid hardcoding.

---

## Wrap-Up

You've now implemented gasless transfers for both USDT (meta-transaction) and USDC (EIP-2612 permit). The key takeaways:

- ✅ Approval strategies vary by token implementation
- ✅ EIP-2612 is the standard, but many tokens predate it
- ✅ Domain separators differ (salt vs version+chainId)
- ✅ Transfer method changes (`transferWithApproval` vs `transferWithPermit`)
- ✅ Fee calculation and relay logic stay consistent

You now have a complete gasless transaction system matching the Nimiq wallet implementation, ready for production use on Polygon mainnet.
