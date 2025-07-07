---
type: lesson
title: Requesting Testnet Funds from Faucet
focus: /index.js
terminal:
  panels: ['output']
---

# Getting Your First Blockchain Funds!

Your wallet is ready, but it's empty! Time to get some testnet NIM so you can start making transactions. We'll use the Nimiq faucet - a service that gives free testnet coins for developers.

## What's a Faucet?

Think of a faucet as a "free money dispenser" for testing:

- **Free testnet NIM** for development and learning
- **No real value** - safe to experiment with
- **Unlimited funds** - the faucet has infinite **testnet** NIM available!
- **Multiple requests allowed** - you can get funds whenever you need them
- **Developer-friendly** - helps you build without spending real money

## Your First Funding Request

We'll make an HTTP request to the faucet API to fund your wallet. Look at the `index.js` file - we're building on the wallet code from the previous lesson.

Let's get you some blockchain funds!

## Step 1: Create Your Faucet Request Function

Add this function to handle the faucet request:

```js
// Request free testnet funds from the faucet
async function requestFundsFromFaucet(address) {
  console.log('💧 Requesting funds from faucet...')

  const response = await fetch(FAUCET_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      address: address.toUserFriendlyAddress(),
      withStackingContract: false
    })
  })

  // Check if request succeeded
  if (!response.ok) {
    throw new Error(`Faucet request failed with status: ${response.status}`)
  }

  const data = await response.json()
  console.log('💰 Faucet request successful!')
  return data
}
```

**What this does:** Sends a POST request to the faucet with your wallet address, asking for free testnet NIM. The faucet will create a transaction to send funds to your address!

## Step 2: Request Your Funds

After creating your wallet and checking the initial balance, add this call:

```js
// Request funds from faucet
await requestFundsFromFaucet(address)
```

**What this does:** Calls the faucet with your address. The faucet will queue a transaction to send you testnet NIM!

## Step 3: Wait and Check Your Balance

Blockchain transactions take a moment to process. Let's wait and check if your funds arrived:

```js
// Wait for blockchain to process the transaction
console.log('⏳ Waiting for transaction to be processed...')
await new Promise(resolve => setTimeout(resolve, 3000))

// Check balance again
const updatedAccount = await client.getAccount(address.toUserFriendlyAddress())
const updatedNim = updatedAccount.balance / 1e5
console.log(`💰 Updated Balance: ${updatedNim} NIM`)

if (updatedAccount.balance > 0) {
  console.log('✅ Funds received successfully!')
}
else {
  console.log('⏳ No funds received yet. Faucet transaction might still be processing.')
}
```

**What this does:** Waits 3 seconds for the blockchain to process the transaction, then checks your balance again. You should see your first NIM appear! 🎉

## What You'll Experience

When you run this code, watch the magic happen:

- ✅ **Empty wallet** - Starts with 0 NIM balance
- ✅ **Faucet request** - Your app asks the faucet for funds
- ✅ **Transaction processing** - The blockchain processes the payment
- ✅ **Funds appear** - Your balance updates with free testnet NIM!

You're about to receive your first blockchain transaction! 🌟

## Unlimited Testnet Funds

**Great news!** The faucet now has unlimited testnet NIM available. This means:

- **No daily limits** - Request as many times as you need
- **Instant availability** - Always ready for development
- **Perfect for testing** - Build applications without worrying about running out of funds
- **Multiple requests** - Great for testing scenarios that need multiple funded wallets

Feel free to experiment and make multiple requests as you learn!

## What This Milestone Means

Once you have testnet funds, you can:

- Send your first blockchain transactions
- Test payment flows in your applications
- Experiment with different transaction types
- Build real functionality without risk

**You're about to have a funded blockchain wallet!** This is a huge step toward building real applications.

## Next: Creating Transactions!

In the next lesson, we'll use these funds to create and sign your first blockchain transaction. You'll learn to send NIM from your wallet to another address!
