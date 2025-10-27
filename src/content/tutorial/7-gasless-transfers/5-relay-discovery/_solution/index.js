import { TypedRequestData } from '@opengsn/common/dist/EIP712/TypedRequestData.js'
import { getHttpClient } from '@opengsn/common/dist/HttpClient.js'
import { ethers } from 'ethers'

// 🔐 Paste your private key from Lesson 1 here!
const PRIVATE_KEY = '0xPASTE_YOUR_PRIVATE_KEY_HERE_FROM_LESSON_1'

// Mainnet addresses
const POLYGON_RPC_URL = 'https://polygon-rpc.com'
const USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
const TRANSFER_CONTRACT_ADDRESS = '0x98E69a6927747339d5E543586FC0262112eBe4BD'
const RELAY_HUB_ADDRESS = '0x6C28AfC105e65782D9Ea6F2cA68df84C9e7d750d'
const RECEIVER_ADDRESS = '0xA3E49ef624bEaC43D29Af86bBFdE975Abaa0E184'

const TRANSFER_AMOUNT_USDT = '0.01'
const STATIC_FEE_USDT = '0.01'

// ABIs
const USDT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function getNonce(address) view returns (uint256)',
]

const TRANSFER_ABI = [
  'function transferWithApproval(address token, uint256 amount, address target, uint256 fee, uint256 approval, bytes32 sigR, bytes32 sigS, uint8 sigV)',
  'function getNonce(address) view returns (uint256)',
]

const RELAY_HUB_ABI = [
  'event RelayServerRegistered(address indexed relayManager, uint256 baseRelayFee, uint256 pctRelayFee, string relayUrl)',
]

async function discoverRelays(provider) {
  console.log('\n🔍 Discovering relays from RelayHub...')

  const relayHub = new ethers.Contract(RELAY_HUB_ADDRESS, RELAY_HUB_ABI, provider)
  const currentBlock = await provider.getBlockNumber()
  const LOOKBACK_BLOCKS = 14400 // ~10 hours on Polygon (2 blocks/min * 60 * 10)

  const fromBlock = currentBlock - LOOKBACK_BLOCKS

  console.log(`Scanning blocks ${fromBlock} to ${currentBlock} (~10 hours)...`)

  const events = await relayHub.queryFilter(
    relayHub.filters.RelayServerRegistered(),
    fromBlock,
    currentBlock,
  )

  console.log(`Found ${events.length} relay registration events`)

  // Extract unique relays
  const relayMap = new Map()
  for (const event of events) {
    const { relayManager, baseRelayFee, pctRelayFee, relayUrl } = event.args
    relayMap.set(relayUrl, {
      url: relayUrl,
      manager: relayManager,
      baseRelayFee: baseRelayFee.toString(),
      pctRelayFee: pctRelayFee.toString(),
    })
  }

  const uniqueRelays = Array.from(relayMap.values())
  console.log(`Found ${uniqueRelays.length} unique relay URLs`)

  return uniqueRelays
}

async function validateRelay(relay, provider) {
  try {
    // Ping relay with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(`${relay.url}/getaddr`, {
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok)
      return null

    const relayInfo = await response.json()

    // Check version (must be 2.x)
    if (!relayInfo.version || !relayInfo.version.startsWith('2.')) {
      console.log(`  ❌ ${relay.url} - wrong version: ${relayInfo.version}`)
      return null
    }

    // Check network (must be Polygon mainnet)
    if (relayInfo.networkId !== '137' && relayInfo.chainId !== '137') {
      console.log(`  ❌ ${relay.url} - wrong network: ${relayInfo.networkId || relayInfo.chainId}`)
      return null
    }

    // Check ready status
    if (!relayInfo.ready) {
      console.log(`  ❌ ${relay.url} - not ready`)
      return null
    }

    // Check worker balance
    const workerBalance = await provider.getBalance(relayInfo.relayWorkerAddress)
    const minBalance = ethers.utils.parseEther('0.01') // 0.01 POL minimum

    if (workerBalance.lt(minBalance)) {
      console.log(`  ❌ ${relay.url} - low balance: ${ethers.utils.formatEther(workerBalance)} POL`)
      return null
    }

    // Check fee limits (max 70% percentage, 0 base fee)
    const pctFee = Number.parseInt(relay.pctRelayFee)
    const baseFee = ethers.BigNumber.from(relay.baseRelayFee)

    if (pctFee > 70) {
      console.log(`  ❌ ${relay.url} - fee too high: ${pctFee}%`)
      return null
    }

    if (baseFee.gt(0)) {
      console.log(`  ❌ ${relay.url} - base fee not acceptable: ${baseFee.toString()}`)
      return null
    }

    console.log(`  ✅ ${relay.url} - valid (${pctFee}% fee, ${ethers.utils.formatEther(workerBalance)} POL)`)

    return {
      ...relay,
      relayWorkerAddress: relayInfo.relayWorkerAddress,
      minGasPrice: relayInfo.minGasPrice,
      version: relayInfo.version,
    }
  }
  catch (error) {
    console.log(`  ❌ ${relay.url} - ${error.message}`)
    return null
  }
}

async function findBestRelay(provider) {
  const relays = await discoverRelays(provider)

  console.log('\n🔬 Validating relays...')

  for (const relay of relays) {
    const validRelay = await validateRelay(relay, provider)
    if (validRelay) {
      return validRelay
    }
  }

  throw new Error('No valid relays found')
}

async function main() {
  console.log('🚀 Gasless USDT transfer with relay discovery...\n')

  const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

  console.log('🔑 Sender:', wallet.address)
  console.log('📍 Receiver:', RECEIVER_ADDRESS)

  // Discover and validate relays
  const relay = await findBestRelay(provider)

  console.log('\n✅ Using relay:', relay.url)
  console.log('   Worker:', relay.relayWorkerAddress)
  console.log('   Fee:', `${relay.pctRelayFee}% + ${relay.baseRelayFee} wei`)

  // Rest of the gasless transaction logic (same as lesson 4)
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider)
  const usdtNonce = await usdt.getNonce(wallet.address)

  const transferAmount = ethers.utils.parseUnits(TRANSFER_AMOUNT_USDT, 6)
  const feeAmount = ethers.utils.parseUnits(STATIC_FEE_USDT, 6)
  const approvalAmount = transferAmount.add(feeAmount)

  // Sign USDT approval
  const approveFunctionSignature = usdt.interface.encodeFunctionData('approve', [
    TRANSFER_CONTRACT_ADDRESS,
    approvalAmount,
  ])

  const usdtDomain = {
    name: 'USDT0',
    version: '1',
    verifyingContract: USDT_ADDRESS,
    salt: ethers.utils.hexZeroPad(ethers.utils.hexlify(137), 32),
  }

  const usdtTypes = {
    MetaTransaction: [
      { name: 'nonce', type: 'uint256' },
      { name: 'from', type: 'address' },
      { name: 'functionSignature', type: 'bytes' },
    ],
  }

  const usdtMessage = {
    nonce: usdtNonce.toNumber(),
    from: wallet.address,
    functionSignature: approveFunctionSignature,
  }

  const approvalSignature = await wallet._signTypedData(usdtDomain, usdtTypes, usdtMessage)
  const { r: sigR, s: sigS, v: sigV } = ethers.utils.splitSignature(approvalSignature)

  // Build transfer calldata
  const transferContract = new ethers.Contract(TRANSFER_CONTRACT_ADDRESS, TRANSFER_ABI, provider)
  const transferCalldata = transferContract.interface.encodeFunctionData('transferWithApproval', [
    USDT_ADDRESS,
    transferAmount,
    RECEIVER_ADDRESS,
    feeAmount,
    approvalAmount,
    sigR,
    sigS,
    sigV,
  ])

  // Build relay request
  const forwarderNonce = await transferContract.getNonce(wallet.address)
  const currentBlock = await provider.getBlockNumber()
  const validUntil = currentBlock + (2 * 60 * 2) // 2 hours

  const relayRequest = {
    request: {
      from: wallet.address,
      to: TRANSFER_CONTRACT_ADDRESS,
      value: '0',
      gas: '350000',
      nonce: forwarderNonce.toString(),
      data: transferCalldata,
      validUntil: validUntil.toString(),
    },
    relayData: {
      gasPrice: '100000000000', // 100 gwei
      pctRelayFee: relay.pctRelayFee,
      baseRelayFee: relay.baseRelayFee,
      relayWorker: relay.relayWorkerAddress,
      paymaster: TRANSFER_CONTRACT_ADDRESS,
      forwarder: TRANSFER_CONTRACT_ADDRESS,
      paymasterData: '0x',
      clientId: '1',
    },
  }

  // Sign relay request
  const forwarderDomain = {
    name: 'Forwarder',
    version: '1',
    chainId: 137,
    verifyingContract: TRANSFER_CONTRACT_ADDRESS,
  }

  const { types, domain, primaryType, message } = new TypedRequestData(
    forwarderDomain.chainId.toString(),
    forwarderDomain.verifyingContract,
    relayRequest,
  )

  const relaySignature = await wallet._signTypedData(domain, types, message)

  // Submit to relay
  console.log('\n📡 Submitting to relay...')
  const relayNonce = await provider.getTransactionCount(relay.relayWorkerAddress)

  const httpClient = getHttpClient()
  const relayResponse = await httpClient.relayTransaction(relay.url, {
    relayRequest,
    metadata: {
      signature: relaySignature,
      approvalData: '0x',
      relayHubAddress: RELAY_HUB_ADDRESS,
      relayMaxNonce: relayNonce + 3,
    },
  })

  const txHash = typeof relayResponse === 'string'
    ? relayResponse
    : relayResponse.signedTx || relayResponse.txHash

  console.log('\n✅ Gasless transaction sent!')
  console.log('🔗 View:', `https://polygonscan.com/tx/${txHash}`)
  console.log('\n💡 Relay discovered dynamically - no hardcoded URLs!')
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message)
})
