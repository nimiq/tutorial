import { HttpClient, HttpWrapper } from '@opengsn/common'
import { TypedRequestData } from '@opengsn/common/dist/EIP712/TypedRequestData.js'
import { ethers } from 'ethers'

// 🔐 Paste your private key from Lesson 1 here!
const PRIVATE_KEY = '0xPASTE_YOUR_PRIVATE_KEY_HERE_FROM_LESSON_1'

// TODO: Query RelayHub for relay registrations
// TODO: Validate each relay (version, network, balance, fees)
// TODO: Select the first valid relay
// TODO: Use it for gasless transfer

async function main() {
  console.log('TODO: Implement relay discovery')
}

main().catch(console.error)
