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

Earlier in this section you built gasless USDT transfers using a custom meta-transaction approval. USDC ships with a standardized approval flow called **EIP-2612 Permit**. This lesson explains what that standard changes, why it exists, and how to adapt the gasless pipeline you already wrote so that USDC transfers go through the same relay infrastructure.

---

## Learning Goals

- Understand when to prefer EIP-2612 Permit instead of custom meta-transaction approvals.
- Sign permit messages that use the version + chainId domain separator defined by EIP-2612.
- Swap the `transferWithApproval` call for the USDC-specific `transferWithPermit`.
- Adjust fee calculations to respect USDC's 6-decimal precision and Polygon USD pricing.

You already know the broader flow: discover relays, compute fees, sign an approval, relay the transaction. The only moving pieces are the approval signature and the calldata that consumes it. Everything else stays intact.

---

## Background: What EIP-2612 Adds

EIP-2612 is an extension of ERC-20 that lets a token holder authorize spending via an off-chain signature instead of an on-chain `approve()` transaction. The signature uses the shared EIP-712 typed-data format:

- **Domain separator** includes the token name, version, chainId, and contract address so signatures cannot be replayed across chains or forks.
- **Permit struct** defines the spender, allowance value, and deadline in a predictable shape.

Tokens like USDC, DAI, and WETH adopted the standard because it enables wallets and relayers to cover approval gas costs while staying interoperable with any contract that understands permits (for example, Uniswap routers or Aave).

Older tokens such as USDT predate EIP-2612, so they expose custom meta-transaction logic instead. That is why the gasless USDT lesson had to sign the entire `transferWithApproval` function payload, whereas USDC only needs the numeric values that describe the allowance.

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

| Aspect               | USDT Meta-Transaction (Lesson 6)     | USDC Permit (This Lesson)     |
| -------------------- | ------------------------------------ | ----------------------------- |
| **Standardization**  | Custom, tether-specific              | Formalized in EIP-2612        |
| **Domain separator** | Uses `salt` derived from chain       | Uses `version` plus `chainId` |
| **Typed struct**     | `MetaTransaction` with encoded bytes | `Permit` with discrete fields |
| **Expiry control**   | No expiration                        | Explicit `deadline`           |
| **Transfer helper**  | `transferWithApproval`               | `transferWithPermit`          |
| **Method selector**  | `0x8d89149b`                         | `0x36efd16f`                  |

Keep this table nearby while refactoring; you will touch each of these rows as you migrate the code.

---

## Step 1: Update Contract Addresses

```js title="usdc-config.js" showLineNumbers mark=1-5
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
const TRANSFER_CONTRACT_ADDRESS = '0x3157d422cd1be13AC4a7cb00957ed717e648DFf2'
const USDC_WMATIC_POOL = '0xA374094527e1673A86dE625aa59517c5dE346d32'

const METHOD_SELECTOR_TRANSFER_WITH_PERMIT = '0x36efd16f'
```

USDC relies on a different relay contract and Uniswap pool than USDT on Polygon. Updating the constants up front prevents subtle bugs later on. For example, querying gas data against the wrong selector yields an optimistic fee that fails on-chain.

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

Key callouts:

- Fetch the **nonce** from the USDC contract itself. EIP-2612 uses a per-owner nonce to prevent replay.
- Calculate the **approval value** as `transfer + fee`. A permit is just an allowance, so the relay must be allowed to withdraw both the payment to the recipient and its compensation.
- USDC accepts a `MaxUint256` deadline, but production systems usually set a shorter deadline (for example `Math.floor(Date.now() / 1000) + 3600`) to minimize replay windows.

---

## Step 3: Build transferWithPermit Call

```js title="transfer-calldata.js" showLineNumbers mark=1-9
const transferContract = new ethers.Contract(
  TRANSFER_CONTRACT_ADDRESS,
  TRANSFER_ABI,
  provider
)

const transferCalldata = transferContract.interface.encodeFunctionData('transferWithPermit', [
  USDC_ADDRESS, // token
  transferAmount, // amount
  RECEIVER_ADDRESS, // target
  feeAmount, // fee
  approvalAmount, // value (approval amount, not deadline)
  r, // sigR
  s, // sigS
  v, // sigV
])
```

`transferWithPermit` consumes the permit signature directly. Compare this to the USDT version: instead of passing an encoded `approve()` call, you now hand the relay the raw signature components. The 5th parameter is the approval `value` (how much the contract can spend), not the permit deadline.

If you changed the permit `value` when signing, make sure the same amount is passed to `transferWithPermit`. The deadline from the permit signature is used internally by the token contract.

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

- `getRequiredRelayGas` evaluates the gas buffer the forwarder demands for `transferWithPermit`. It usually matches the USDT value (~72,000 gas) but querying removes guesswork.
- USDC keeps **6 decimals**, so multiply/divide by `1_000_000` when converting between POL and USDC. Avoid using `ethers.utils.parseUnits(..., 18)` out of habit.
- The `polPerUsdc` helper should target the USDC/WMATIC pool; pricing against USDT would skew the fee at times when the two stablecoins diverge.

---

## Step 5: Rest of Flow Stays the Same

After building the transfer calldata, the rest is identical to the gasless USDT lesson:

1. Get forwarder nonce from transfer contract
2. Build OpenGSN `ForwardRequest`
3. Sign ForwardRequest with EIP-712
4. Submit to relay via `HttpClient`
5. Broadcast transaction

If you already wrapped these steps in helper functions, you should not need to touch them. The permit signature simply slots into the existing request payload where the USDT approval bytes previously sat.

---

## ABI Changes

```js title="usdc-abi.js" showLineNumbers mark=1-5
const TRANSFER_ABI = [
  // Changed from transferWithApproval
  'function transferWithPermit(address token, uint256 amount, address target, uint256 fee, uint256 value, bytes32 sigR, bytes32 sigS, uint8 sigV)',
  'function getNonce(address) view returns (uint256)',
  'function getRequiredRelayGas(bytes4 methodId) view returns (uint256)',
]
```

`transferWithPermit` mirrors OpenZeppelin's relay helper, so the ABI change is straightforward. Keeping the ABI narrowly scoped makes tree-shaking easier if you bundle the tutorial for production later.

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

## Testing and Troubleshooting

- **Signature mismatch**: Double-check that `domain.name` exactly matches the on-chain token name. For USDC on Polygon it is `"USD Coin"`; capitalization matters.
- **Invalid deadline**: If the relay says the permit expired, inspect the value you passed to `deadline` and ensure your local clock is not skewed.
- **Allowance too low**: If the recipient receives funds but the relay reverts, print the computed `feeAmount` and make sure the permit covered both transfer and fee.

Running `npm run usdc` after each change keeps the feedback loop tight and mirrors how the Nimiq wallet tests the same flow.

---

## Production Considerations

1. **Check token support**: Not all ERC20s have permit. Fallback to standard `approve()` + `transferFrom()` if needed.
2. **Deadline vs MaxUint256**: Production systems often use block-based deadlines (e.g., `currentBlock + 100`) for tighter security.
3. **Domain parameters**: Always verify `name` and `version` match the token contract - wrong values = invalid signature.
4. **Method selector lookup**: Store selectors in config per token to avoid hardcoding.
5. **Permit reuse policy**: Decide whether to reuse a permit for multiple transfers or issue a fresh one per relay request. Fresh permits simplify accounting but require re-signing each time.

---

## Wrap-Up

You now support gasless transfers for both USDT (custom meta-transaction) and USDC (EIP-2612 permit). Keep these takeaways in mind:

- ✅ Approval strategies vary across tokens; detect the capability before deciding on the flow.
- ✅ EIP-2612 standardizes the permit format: domain fields and struct definitions must match exactly.
- ✅ `transferWithPermit` lets you drop the bulky encoded function signature and pass raw signature parts instead.
- ✅ Fee and relay logic remain unchanged once the calldata is assembled correctly.

You now have a complete gasless transaction system matching the Nimiq wallet implementation, ready for production use on Polygon mainnet.
