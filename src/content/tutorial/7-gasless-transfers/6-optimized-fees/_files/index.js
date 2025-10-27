import { ethers } from 'ethers';
import { getHttpClient } from '@opengsn/common/dist/HttpClient.js';
import { TypedRequestData } from '@opengsn/common/dist/EIP712/TypedRequestData.js';

// 🔐 Paste your private key from Lesson 1 here!
const PRIVATE_KEY = '0xPASTE_YOUR_PRIVATE_KEY_HERE_FROM_LESSON_1';

// TODO: Implement relay discovery
// TODO: Calculate optimized fees for each relay:
//       - Get network gas price and relay minimum
//       - Apply safety buffers (10% mainnet, 25% testnet)
//       - Calculate POL cost with relay percentage fee
//       - Convert to USDT with safety margin
// TODO: Compare relays and select the cheapest
// TODO: Use optimized fee for gasless transfer

async function main() {
  console.log('TODO: Implement optimized fee calculation');
}

main().catch(console.error);
