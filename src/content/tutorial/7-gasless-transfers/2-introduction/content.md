---
type: lesson
title: "Introduction to Gasless Transactions"
focus: /index.js
mainCommand: npm run demo
prepareCommands:
  - npm install
terminal:
  open: true
  activePanel: 0
  panels: ['output']
---

# Introduction to Gasless Transactions

Welcome to the last stretch of the tutorial series. By the end of this section you will know how to let users move stablecoins on Polygon **without holding any POL for gas**. If you can already send a regular ERC-20 transfer on Polygon, you have all the background you need—we will layer OpenGSN concepts on top in digestible steps.

---

## Why Gas Gets in the Way

Section 5 showed the standard Polygon flow: every transaction needs POL to pay gas. That single requirement creates friction at almost every touch point:
- New users now juggle two tokens—POL for fees *and* the asset they actually care about.
- Onboarding breaks whenever faucets run dry, exchanges delay KYC, or bridges are intimidating.
- Support teams keep answering the same question: *"Why can’t I just pay with the token I’m sending?"*

Our goal is to flip that experience so the end user only thinks about the asset they want to move.

---

## Gasless Payments in Plain Language

Think of OpenGSN as a courier service. Your user writes a letter (signs a request) and hands it to a courier (a relay). The courier pays the highway tolls (gas in POL) to deliver the letter on-chain. Once the job is done, your contract thanks the courier by reimbursing the tolls *plus* a service fee in the token the user chose—USDT in our case. The user never had to touch POL.

---

## OpenGSN Meta-Transactions Step by Step

Let’s contrast the familiar “gasful” path with the OpenGSN equivalent:

### Traditional (Gasful) Flow
```
1. User signs a transaction with their wallet.
2. The same wallet broadcasts the transaction and pays gas in POL.
3. Polygon executes the transaction.
```

### Gasless Flow with OpenGSN
```
1. User signs a meta-transaction off-chain. No gas is spent yet.
2. A relay server receives the signed payload and submits it on-chain, paying the POL gas up front.
3. Your smart contract (through a Paymaster) reimburses the relay in USDT and adds an agreed fee.
4. The user only spends USDT, even though the transaction settled on Polygon.
```

**Result:** The user can keep their POL balance at zero and still enjoy a successful transfer.

---

## Key Players in the OpenGSN Stack

- **Relay** – A server operated by the network or a provider that fronts the POL gas. You pay it back in tokens you control.
- **RelayHub** – The on-chain contract that coordinates relays, tracks their stakes, and holds deposits.
- **Forwarder** – Checks that the meta-transaction was genuinely signed by your user before calling your target contract.
- **Paymaster** – A contract you deploy that defines when and how a relay gets reimbursed. In this section, it pays the relay in USDT.
- **Meta-Transaction** – The signed payload that combines the “what to execute” instructions with relay payment terms and expirations.

Keep these names in mind—the upcoming lessons will point back to them as you implement each part.

---

## Roadmap for This Section

Over four lessons we will evolve a gasless payment flow from “hello world” to production-ready:

### Lesson 2: The Gasful Baseline
- Send USDT the traditional way to measure the true gas cost.
- Record balances and receipts so you can compare later.

### Lesson 3: Gasless with a Static Relay
- Plug in a known relay URL and wire OpenGSN into your script.
- Sign EIP-712 payloads for approvals and relay requests.
- Complete a gasless USDT transfer where the relay fee is hardcoded.

### Lesson 4: Discovering Relays Dynamically
- Query RelayHub for active relays and verify their health signals.
- Fall back gracefully if a relay is offline or misconfigured.

### Lesson 5: Optimized Fee Calculation
- Derive dynamic fees from live gas prices and relay-specific terms.
- Apply safety buffers so you never underpay.
- Compare multiple relays and pick the cheapest healthy option—exactly what ships in the Nimiq wallet.

---

## Why This Pattern Matters

Gasless transactions unlock better UX across the board:
- **Wallets:** Onboard users faster—no swapping or bridging needed before the first send.
- **Games:** Players stay immersed in in-game currencies instead of juggling gas tokens.
- **Payments:** Merchants collect USDT without explaining side costs to customers.
- **Onboarding:** First-time users succeed without leaving your app to acquire POL.

You will see the same ideas in production systems such as the Nimiq Wallet, Biconomy, and Gelato.

---

## Meta-Transactions Under the Hood

Meta-transactions are simply “transactions about transactions.” Instead of sending the Polygon transaction yourself, you sign a message describing:
- Which contract function to call (for example, `transfer` on USDT and the intended recipient).
- The gas budget and expiration rules the relay must respect.
- How much the relay should be paid back and in what token.

When the relay submits that payload on-chain:
1. The **Forwarder** verifies the signature really belongs to your user.
2. The Forwarder executes the requested contract call on your behalf.
3. Your contract (through the Paymaster) transfers the fee from your user to the relay.
4. The relay ends up whole—it recovers the POL it spent plus its service fee.

### OpenGSN Architecture (High Level)

```
┌─────────┐   sign meta-tx   ┌───────────┐
│  User   │ ─────────────────▶│  Relay    │
│ (no POL)│                   │  Server   │
└─────────┘                   └─────┬─────┘
                                    │ submits on-chain
                                    │ (pays POL gas)
                                    ▼
                           ┌─────────────────┐
                           │   RelayHub      │
                           │ (smart contract)│
                           └────────┬────────┘
                                    │ validates
                                    ▼
                           ┌─────────────────┐
                           │  Forwarder      │
                           │ (verifies sig)  │
                           └────────┬────────┘
                                    │ executes
                                    ▼
                           ┌─────────────────┐
                           │ Your Contract   │
                           │ (transfer USDT) │
                           │ (pay relay fee) │
                           └─────────────────┘
```

---

## Prerequisites

⚠️ **Polygon mainnet is required.** OpenGSN is not deployed on the Amoy testnet.

Make sure you have:
- A wallet with **2-5 USDT** on Polygon mainnet (more is fine).
- A small buffer of **POL (0.01-0.1)** to cover the baseline transaction in Lesson 2.
- A **mainnet RPC endpoint** from Alchemy, Infura, or another provider.

> 💡 Need USDT? Bridge it from Ethereum, swap on an exchange, or use any reputable source. You only need a couple of dollars for the exercises, but having a little extra makes debugging easier.

---

## The Demo Script

The accompanying script shows the **fully optimized flow from Lesson 5**. The demo runs automatically when you open this lesson—check the terminal output to watch the simulation unfold. Treat it as both a preview and a troubleshooting companion:
- **Review the terminal** to see how relay discovery and fee calculation work together.
- **Revisit the code** as you implement each lesson to confirm your work.
- **Borrow patterns** for production projects once you understand every step.

> 💡 This demo requires mainnet USDT in your wallet. Until you fund it you will see a warning about missing tokens, but the walkthrough still shows the sequence of calls so you can follow along conceptually.

---

## Next Up

Move on to **Lesson 2: The Gasful Baseline** to perform one last traditional transfer. You will measure the exact gas cost before we eliminate it with OpenGSN.
