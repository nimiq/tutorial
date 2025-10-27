import { ethers } from 'ethers';
import { getHttpClient } from '@opengsn/common/dist/HttpClient.js';
import { TypedRequestData } from '@opengsn/common/dist/EIP712/TypedRequestData.js';

// 🔐 Paste your private key from Lesson 1 here!
const PRIVATE_KEY = '0xPASTE_YOUR_PRIVATE_KEY_HERE_FROM_LESSON_1';

// Mainnet addresses
const POLYGON_RPC_URL = 'https://polygon-rpc.com';
const USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const TRANSFER_CONTRACT_ADDRESS = '0x98E69a6927747339d5E543586FC0262112eBe4BD';
const RELAY_HUB_ADDRESS = '0x6C28AfC105e65782D9Ea6F2cA68df84C9e7d750d';
const RECEIVER_ADDRESS = '0xA3E49ef624bEaC43D29Af86bBFdE975Abaa0E184';

const TRANSFER_AMOUNT_USDT = '0.01';

// Gas limits by method (from Nimiq wallet)
const GAS_LIMITS = {
  transfer: 65000,
  transferWithPermit: 72000,
  transferWithApproval: 72000,
  swapWithApproval: 85000,
};

// ABIs
const USDT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function getNonce(address) view returns (uint256)',
];

const TRANSFER_ABI = [
  'function transferWithApproval(address token, uint256 amount, address target, uint256 fee, uint256 approval, bytes32 sigR, bytes32 sigS, uint8 sigV)',
  'function getNonce(address) view returns (uint256)',
  'function getRequiredRelayGas(bytes4 methodId) view returns (uint256)',
];

const RELAY_HUB_ABI = [
  'event RelayServerRegistered(address indexed relayManager, uint256 baseRelayFee, uint256 pctRelayFee, string relayUrl)',
  'function calldataGasCost(uint256) view returns (uint256)',
];

async function discoverRelays(provider) {
  const relayHub = new ethers.Contract(RELAY_HUB_ADDRESS, RELAY_HUB_ABI, provider);
  const currentBlock = await provider.getBlockNumber();
  const LOOKBACK_BLOCKS = 14400; // ~10 hours

  const events = await relayHub.queryFilter(
    relayHub.filters.RelayServerRegistered(),
    currentBlock - LOOKBACK_BLOCKS,
    currentBlock
  );

  const relayMap = new Map();
  for (const event of events) {
    const { relayManager, baseRelayFee, pctRelayFee, relayUrl } = event.args;
    relayMap.set(relayUrl, {
      url: relayUrl,
      manager: relayManager,
      baseRelayFee: baseRelayFee,
      pctRelayFee: pctRelayFee.toNumber(),
    });
  }

  return Array.from(relayMap.values());
}

async function validateRelay(relay, provider) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${relay.url}/getaddr`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const relayInfo = await response.json();

    // Basic validation
    if (!relayInfo.version?.startsWith('2.')) return null;
    if (relayInfo.networkId !== '137' && relayInfo.chainId !== '137') return null;
    if (!relayInfo.ready) return null;

    const workerBalance = await provider.getBalance(relayInfo.relayWorkerAddress);
    if (workerBalance.lt(ethers.utils.parseEther('0.01'))) return null;

    // Fee validation
    if (relay.pctRelayFee > 70) return null;
    if (relay.baseRelayFee.gt(0)) return null;

    return {
      ...relay,
      relayWorkerAddress: relayInfo.relayWorkerAddress,
      minGasPrice: ethers.BigNumber.from(relayInfo.minGasPrice || 0),
      version: relayInfo.version,
    };
  } catch {
    return null;
  }
}

async function calculateOptimalFee(relay, provider, method = 'transferWithApproval', isMainnet = true) {
  // Step 1: Get network gas price
  const networkGasPrice = await provider.getGasPrice();

  console.log('  Network gas price:', ethers.utils.formatUnits(networkGasPrice, 'gwei'), 'gwei');
  console.log('  Relay min gas price:', ethers.utils.formatUnits(relay.minGasPrice, 'gwei'), 'gwei');

  // Step 2: Take max of network and relay minimum
  const baseGasPrice = networkGasPrice.gt(relay.minGasPrice) ? networkGasPrice : relay.minGasPrice;

  // Step 3: Apply buffer (10% mainnet, 25% testnet)
  const bufferPercentage = isMainnet ? 110 : 125;
  const bufferedGasPrice = baseGasPrice.mul(bufferPercentage).div(100);

  console.log('  Buffered gas price:', ethers.utils.formatUnits(bufferedGasPrice, 'gwei'), 'gwei', `(${bufferPercentage}%)`);

  // Step 4: Get gas limit for method
  const gasLimit = GAS_LIMITS[method];

  console.log('  Gas limit:', gasLimit);

  // Step 5: Calculate base cost
  const baseCost = bufferedGasPrice.mul(gasLimit);

  // Step 6: Apply relay percentage fee
  const costWithPctFee = baseCost.mul(100 + relay.pctRelayFee).div(100);

  // Step 7: Add base relay fee
  const totalPOLCost = costWithPctFee.add(relay.baseRelayFee);

  console.log('  Total POL cost:', ethers.utils.formatEther(totalPOLCost), 'POL');
  console.log('  Relay fee:', relay.pctRelayFee + '%');

  // Step 8: Convert to USDT (conservative rate: $0.50 per POL)
  const POL_PRICE_USD = 0.50; // Conservative estimate
  const feeInUSD = parseFloat(ethers.utils.formatEther(totalPOLCost)) * POL_PRICE_USD;

  // Step 9: Apply 10% safety buffer for USDT conversion
  const feeInUSDT = ethers.utils.parseUnits((feeInUSD * 1.10).toFixed(6), 6);

  console.log('  USDT fee:', ethers.utils.formatUnits(feeInUSDT, 6), 'USDT');

  return {
    usdtFee: feeInUSDT,
    gasPrice: bufferedGasPrice,
    gasLimit,
    polCost: totalPOLCost,
  };
}

async function findBestRelay(provider) {
  console.log('\n🔍 Discovering relays...');
  const relays = await discoverRelays(provider);
  console.log(`Found ${relays.length} unique relay URLs`);

  console.log('\n🔬 Validating and calculating fees...\n');

  let bestRelay = null;
  let lowestFee = ethers.constants.MaxUint256;

  for (const relay of relays) {
    const validRelay = await validateRelay(relay, provider);

    if (!validRelay) continue;

    console.log(`📊 ${relay.url}`);

    try {
      const feeData = await calculateOptimalFee(validRelay, provider);

      if (feeData.usdtFee.lt(lowestFee)) {
        lowestFee = feeData.usdtFee;
        bestRelay = { ...validRelay, feeData };
        console.log('  ✅ New best relay!\n');
      } else {
        console.log('  ⚪ Not the cheapest\n');
      }
    } catch (error) {
      console.log('  ❌ Fee calculation failed:', error.message, '\n');
    }
  }

  if (!bestRelay) {
    throw new Error('No valid relays found');
  }

  return bestRelay;
}

async function main() {
  console.log('🚀 Gasless USDT transfer with optimized fee calculation...\n');

  const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log('🔑 Sender:', wallet.address);
  console.log('📍 Receiver:', RECEIVER_ADDRESS);

  // Find best relay with optimized fee
  const relay = await findBestRelay(provider);

  console.log('\n✅ Selected relay:', relay.url);
  console.log('   Worker:', relay.relayWorkerAddress);
  console.log('   Optimized USDT fee:', ethers.utils.formatUnits(relay.feeData.usdtFee, 6), 'USDT');
  console.log('   Gas price:', ethers.utils.formatUnits(relay.feeData.gasPrice, 'gwei'), 'gwei');

  // Build transaction with calculated fee
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const usdtNonce = await usdt.getNonce(wallet.address);

  const transferAmount = ethers.utils.parseUnits(TRANSFER_AMOUNT_USDT, 6);
  const feeAmount = relay.feeData.usdtFee; // Use optimized fee
  const approvalAmount = transferAmount.add(feeAmount);

  console.log('\n💰 Transfer:', TRANSFER_AMOUNT_USDT, 'USDT');
  console.log('💸 Optimized fee:', ethers.utils.formatUnits(feeAmount, 6), 'USDT');
  console.log('✅ Total approval:', ethers.utils.formatUnits(approvalAmount, 6), 'USDT');

  // Sign USDT approval
  const approveFunctionSignature = usdt.interface.encodeFunctionData('approve', [
    TRANSFER_CONTRACT_ADDRESS,
    approvalAmount,
  ]);

  const usdtDomain = {
    name: 'USDT0',
    version: '1',
    verifyingContract: USDT_ADDRESS,
    salt: ethers.utils.hexZeroPad(ethers.utils.hexlify(137), 32),
  };

  const usdtTypes = {
    MetaTransaction: [
      { name: 'nonce', type: 'uint256' },
      { name: 'from', type: 'address' },
      { name: 'functionSignature', type: 'bytes' },
    ],
  };

  const usdtMessage = {
    nonce: usdtNonce.toNumber(),
    from: wallet.address,
    functionSignature: approveFunctionSignature,
  };

  const approvalSignature = await wallet._signTypedData(usdtDomain, usdtTypes, usdtMessage);
  const { r: sigR, s: sigS, v: sigV } = ethers.utils.splitSignature(approvalSignature);

  // Build transfer calldata
  const transferContract = new ethers.Contract(TRANSFER_CONTRACT_ADDRESS, TRANSFER_ABI, provider);
  const transferCalldata = transferContract.interface.encodeFunctionData('transferWithApproval', [
    USDT_ADDRESS,
    transferAmount,
    RECEIVER_ADDRESS,
    feeAmount,
    approvalAmount,
    sigR,
    sigS,
    sigV,
  ]);

  // Build relay request with optimized gas price
  const forwarderNonce = await transferContract.getNonce(wallet.address);
  const currentBlock = await provider.getBlockNumber();
  const validUntil = currentBlock + (2 * 60 * 2); // 2 hours

  const relayRequest = {
    request: {
      from: wallet.address,
      to: TRANSFER_CONTRACT_ADDRESS,
      value: '0',
      gas: relay.feeData.gasLimit.toString(),
      nonce: forwarderNonce.toString(),
      data: transferCalldata,
      validUntil: validUntil.toString(),
    },
    relayData: {
      gasPrice: relay.feeData.gasPrice.toString(),
      pctRelayFee: relay.pctRelayFee.toString(),
      baseRelayFee: relay.baseRelayFee.toString(),
      relayWorker: relay.relayWorkerAddress,
      paymaster: TRANSFER_CONTRACT_ADDRESS,
      forwarder: TRANSFER_CONTRACT_ADDRESS,
      paymasterData: '0x',
      clientId: '1',
    },
  };

  // Sign relay request
  const forwarderDomain = {
    name: 'Forwarder',
    version: '1',
    chainId: 137,
    verifyingContract: TRANSFER_CONTRACT_ADDRESS,
  };

  const { types, domain, primaryType, message } = new TypedRequestData(
    forwarderDomain.chainId.toString(),
    forwarderDomain.verifyingContract,
    relayRequest
  );

  const relaySignature = await wallet._signTypedData(domain, types, message);

  // Submit to relay
  console.log('\n📡 Submitting to relay...');
  const relayNonce = await provider.getTransactionCount(relay.relayWorkerAddress);

  const httpClient = getHttpClient();
  const relayResponse = await httpClient.relayTransaction(relay.url, {
    relayRequest,
    metadata: {
      signature: relaySignature,
      approvalData: '0x',
      relayHubAddress: RELAY_HUB_ADDRESS,
      relayMaxNonce: relayNonce + 3,
    },
  });

  const txHash = typeof relayResponse === 'string'
    ? relayResponse
    : relayResponse.signedTx || relayResponse.txHash;

  console.log('\n✅ Gasless transaction sent!');
  console.log('🔗 View:', `https://polygonscan.com/tx/${txHash}`);
  console.log('\n💡 Used production-grade fee optimization:');
  console.log('   ✅ Dynamic gas price discovery');
  console.log('   ✅ Network-aware safety buffers');
  console.log('   ✅ Relay fee comparison');
  console.log('   ✅ POL-to-USDT conversion with safety margin');
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
