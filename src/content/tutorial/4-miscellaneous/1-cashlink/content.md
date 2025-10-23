---
type: lesson
title: "Cashlinks: Shareable Blockchain Payments"
previews: false
focus: /index.js
mainCommand: npm run dev
prepareCommands:
  - npm install
terminal:
  open: true
  activePanel: 0
  panels: ['output']
---

# Cashlinks: Shareable Blockchain Payments

We will learn how to create a Nimiq **cashlink**—a shareable payment link that lets anyone claim NIM from you, powered by the blockchain.

Think of a cashlink like a digital gift card or a prepaid scratch-off ticket: you load it with value, share the link, and whoever receives it can "scratch off" (open the link) to claim the funds. No account or app needed—just the link! 🎁

---

## What is a Cashlink?

A **cashlink** is a special payment link that holds NIM (Nimiq's cryptocurrency) in a smart contract. Anyone with the link can claim the funds—perfect for gifts, rewards, or onboarding new users. Cashlinks use cryptography and smart contracts (HTLCs) to ensure only the recipient can unlock the funds.

---

## What You'll Learn

- ✅ How to connect to the Nimiq blockchain using the Web Client
- ✅ How to generate a secure wallet and get testnet NIM
- ✅ How to create a cashlink (with a unique keypair)
- ✅ How to fund the cashlink and monitor its status
- ✅ How to build and share a cashlink URL

---

We already prepared a basic script for you with a client that connects to the Nimiq network and a wallet with some funds (`keyPair`).

The idea of the tutorial is that you will create a new Wallet with some funds on it. Then, you will generate a special link that contains the private key, so whoever opens the link can claim the funds for itself.

## Step 1: Creating the Cashlink Keypair

A cashlink is powered by its own unique keypair. This keypair controls the funds until someone claims them.

```js
import { KeyPair } from '@nimiq/core'

const cashlinkKeyPair = KeyPair.generate()
const cashlinkAddress = cashlinkKeyPair.toAddress()
```

**Why?**

- The cashlink's private key is embedded in the link. Whoever opens the link can claim the funds.
- The address is where you'll send the NIM.

---

## Step 2: Building the Cashlink URL

The cashlink URL encodes the private key, amount, and message. We'll use a helper function for this:

```js
import { BufferUtils, SerialBuffer } from '@nimiq/core'
import { Utf8Tools } from '@nimiq/utils/utf8-tools'

function getCashlinkUrl(network, cashlinkKeyPair, amount, message) {
  const hubDomain = network === 'MainAlbatross' ? 'https://hub.nimiq.com' : 'https://hub.nimiq-testnet.com'

  const messageBytes = Utf8Tools.stringToUtf8ByteArray(message)
  const buf = new SerialBuffer(
    cashlinkKeyPair.privateKey.serializedSize + 8 + (messageBytes.byteLength ? 1 : 0) + messageBytes.byteLength
  )
  buf.write(cashlinkKeyPair.privateKey.serialize())
  buf.writeUint64(amount)
  if (messageBytes.byteLength) {
    buf.writeUint8(messageBytes.byteLength)
    buf.write(messageBytes)
  }
  const hashUrl = BufferUtils
    .toBase64Url(buf)
    .replace(/\./g, '=')
    .replace(/\w{257,}/g, match => match.replace(/.{256}/g, '$&~'))
  return hashUrl
}
```

As you can see we are using `Utf8Tools` from `@nimiq/utils` library. This library contains a lot of functionality that the Web Client does not.

**What this does:**

- Serializes the private key, amount, and message into a URL-safe string
- This string is appended to the Nimiq Hub URL to create the cashlink

Finally we create the `cashlinkUrl` in the `main` function:

```js
const cashlinkUrl = getCashlinkUrl(network, cashlinkKeyPair, amount, message)
```

## Step 3: Monitoring the Cashlink

We can listen for transactions to see when the cashlink is funded and when it is claimed:

```js
import { Address } from '@nimiq/core'

async function setupCashlinkListeners(client, cashlinkAddress, senderAddress) {
  await client.addTransactionListener(
    (transaction) => {
      const recipient = Address.fromUserFriendlyAddress(transaction.recipient)
      const sender = Address.fromUserFriendlyAddress(transaction.sender)
      const isIncoming = recipient.equals(cashlinkAddress)
      const isOutgoing = sender.equals(cashlinkAddress)
      if (isIncoming) {
        console.log('\n💰 CASH LINK FUNDED!')
        console.log(`├─ Amount: ${transaction.value / 1e5} NIM`)
        console.log(`├─ From: ${transaction.sender}`)
        console.log(`├─ To: ${transaction.recipient}`)
        console.log(`└─ Transaction Hash: ${transaction.transactionHash}`)
      }
      if (isOutgoing) {
        console.log('\n🔓 CASH LINK CLAIMED!')
        console.log(`├─ Amount: ${transaction.value / 1e5} NIM`)
        console.log(`├─ From: ${transaction.sender}`)
        console.log(`├─ To: ${transaction.recipient}`)
        console.log(`└─ Transaction Hash: ${transaction.transactionHash}`)
      }
    },
    [cashlinkAddress, senderAddress]
  )
  console.log('📡 Monitoring for cashlink funding and claiming...\n')
}
```

**What this does:**

- Listens for transactions involving the cashlink address
- Notifies you when the cashlink is funded or claimed
- Helps you debug any issues you might find

Then you need to trigger the function from the `main` function:

```js
await setupCashlinkListeners(client, cashlinkAddress, senderAddress)
```

---

## Step 4: Funding the Cashlink

Now, let's send NIM to the cashlink address. Funding the Cashlink is a simply as sending some NIM to the new wallet we have created:

```js
import { AccountType, Transaction, TransactionFlag } from '@nimiq/core'

async function fundCashlink(client, keyPair, cashlinkAddress, amount) {
  const headBlock = await client.getHeadBlock()
  const networkId = await client.getNetworkId()
  const tx = new Transaction(
    keyPair.toAddress(),
    AccountType.Basic,
    new Uint8Array(0),
    cashlinkAddress,
    AccountType.Basic,
    [0, 132, 128, 146, 135], // Extra data for cashlink funding
    BigInt(amount),
    0n,
    TransactionFlag.None,
    headBlock.height,
    networkId,
  )
  tx.sign(keyPair)
  const txHash = await client.sendTransaction(tx)
  return txHash
}
```

**What this does:**

- Creates and signs a transaction to fund the cashlink
- Uses special extra data to mark it as a cashlink
- Sends the transaction to the blockchain

Now you need to trigger the function from the `main` function together with some logs:

```js
const tx = await fundCashlink(client, keyPair, cashlinkAddress, amount)

console.log('\n🎉 Cashlink created successfully!')
console.log(`\n\n 👉 Transaction Hash: ${tx.transactionHash}`)
console.log(`\n\n 👉 Share or open this URL with someone to let them claim ${amount / 1e5} NIM!\n${cashlinkUrl}\n`)
console.log('\n⏰ Keep this script running to see when the cashlink is claimed...')
```

---

## Step 5: Claim your Cashlink

Now, once the script is running you will see a URL linking to the Nimiq Hub. You can open the link and click `Claim`. Once it is complete come back to this tutorial to see how the console prints the success message!

---

## Summary

- You generated a cashlink keypair and built a cashlink URL
- You funded the cashlink and set up listeners to monitor its status
- You can now share the cashlink URL—anyone with the link can claim the NIM!

## Your tasks

Now here are some ideas you can try:

1. Change the amount or message
2. Create a custom Cashlink

### Custom Cashlink

You can customize the Cashlinks with a custom theme:

```js
const CashlinkTheme = {
  Unspecified: 0,
  Standard: 1,
  Christmas: 2,
  LunarNewYear: 3,
  Easter: 4,
  Generic: 5,
  Birthday: 6,
}

const theme = CashlinkTheme.Birthday // In our example we will do a birthday
```

Then in you need to update `getCashlinkUrl` to add the `theme` to the Cashlink URL:

```js
function getCashlinkUrl(network, cashlinkKeyPair, amount, message) {
  const hubDomain = network === 'MainAlbatross'
    ? 'https://hub.nimiq.com'
    : 'https://hub.nimiq-testnet.com'

  const messageBytes = Utf8Tools.stringToUtf8ByteArray(message)

  const buf = new SerialBuffer(
    cashlinkKeyPair.privateKey.serializedSize // key
    + 8 // value
    + (messageBytes.byteLength || theme ? 1 : 0)
    + messageBytes.byteLength
    + (theme ? 1 : 0)
  )

  buf.write(cashlinkKeyPair.privateKey.serialize())
  buf.writeUint64(amount)

  if (messageBytes.byteLength || theme) {
    buf.writeUint8(messageBytes.byteLength)
    buf.write(messageBytes)
  }

  if (theme)
    buf.writeUint8(theme)

  const hashUrl = BufferUtils
    .toBase64Url(buf)
    .replace(/\./g, '=') // replace trailing . by = because of URL parsing issues on iPhone.
    .replace(/\w{257,}/g, match => match.replace(/.{256}/g, '$&~')) // break long words by adding a ~ every 256 characters

  return `${hubDomain}/cashlink/#${hashUrl}`
}
```

Finally we update the message that we want to add to the cashlink:

```js
const message = 'Happy Birthday! 🥳'
```

Now, when you open the Nimiq Hub, you will see a custom style for your Cashlink!

---

## Want to Create Cashlinks in Bulk?

Ready to take your cashlink skills to the next level? For advanced use cases like creating hundreds of cashlinks for events, marketing campaigns, or bulk payments, check out the **Nimiq Cashlink Generator** - a powerful command-line tool that can:

- 🔄 Generate and manage cashlinks in bulk
- 📊 Create detailed statistics on cashlink usage
- 🎨 Generate QR codes and printable vouchers
- 💰 Fund and claim multiple cashlinks efficiently
- 📈 Track cashlink performance and analytics

👉 **[Explore the Nimiq Cashlink Generator](https://github.com/nimiq/cashlink-generator)**

This tool is perfect for businesses, developers, and anyone who needs to create cashlinks at scale. Go ahead and explore the advanced features that can help you build sophisticated cashlink campaigns!
