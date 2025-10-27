import { ethers } from 'ethers';
import { POLYGON_CONFIG, USDT_ABI, USDT_DECIMALS } from './lib/constants.js';
import { checkBalances } from './lib/balances.js';

// 🔐 Paste your private key from Lesson 1 here!
const PRIVATE_KEY = '0xPASTE_YOUR_PRIVATE_KEY_HERE_FROM_LESSON_1';

// Recipient address (Nimiq-controlled - contact us if you need funds back)
const RECEIVER_ADDRESS = '0xA3E49ef624bEaC43D29Af86bBFdE975Abaa0E184';

const TRANSFER_AMOUNT_USDT = '0.01'; // Minimal amount for demo

async function main() {
  const POLYGON_RPC_URL = 'https://polygon-rpc.com';

  const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log('Sender:', wallet.address);
  console.log('Receiver:', RECEIVER_ADDRESS);
  console.log('\n--- Balances before transfer ---');

  const balancesBefore = await checkBalances(provider, wallet, RECEIVER_ADDRESS);

  console.log('Sender MATIC:', balancesBefore.sender.polFormatted, POLYGON_CONFIG.nativeSymbol);
  console.log('Sender USDT:', balancesBefore.sender.usdtFormatted, 'USDT');
  console.log('Receiver USDT:', balancesBefore.receiver.usdtFormatted, 'USDT');

  const amountBaseUnits = ethers.utils.parseUnits(TRANSFER_AMOUNT_USDT, USDT_DECIMALS);

  console.log(`\nSending ${TRANSFER_AMOUNT_USDT} USDT to ${RECEIVER_ADDRESS}...`);

  const usdt = new ethers.Contract(POLYGON_CONFIG.usdtTokenAddress, USDT_ABI, wallet);
  const transferTx = await usdt.transfer(RECEIVER_ADDRESS, amountBaseUnits);

  console.log('Submitted tx:', `${POLYGON_CONFIG.explorerBaseUrl}${transferTx.hash}`);
  const receipt = await transferTx.wait();
  console.log('Mined in block', receipt.blockNumber);

  const balancesAfter = await checkBalances(provider, wallet, RECEIVER_ADDRESS);

  console.log('\n--- Balances after transfer ---');
  console.log('Sender USDT:', balancesAfter.sender.usdtFormatted, 'USDT');
  console.log('Receiver USDT:', balancesAfter.receiver.usdtFormatted, 'USDT');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
