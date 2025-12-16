import { HttpClient, HttpWrapper } from '@opengsn/common'
import { TypedRequestData } from '@opengsn/common/dist/EIP712/TypedRequestData.js'
import { ethers } from 'ethers'

// 🔐 Paste your private key from Lesson 1 here!
const PRIVATE_KEY = '0xPASTE_YOUR_PRIVATE_KEY_HERE_FROM_LESSON_1'

// Mainnet addresses
const POLYGON_RPC_URL = 'https://polygon-rpc.com'
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
const TRANSFER_CONTRACT_ADDRESS = '0x3157d422cd1be13AC4a7cb00957ed717e648DFf2'
const RELAY_HUB_ADDRESS = '0x6C28AfC105e65782D9Ea6F2cA68df84C9e7d750d'
const RECEIVER_ADDRESS = '0xA3E49ef624bEaC43D29Af86bBFdE975Abaa0E184'

const TRANSFER_AMOUNT_USDC = '0.01'

// TODO: Add Uniswap V3 addresses
// - UNISWAP_QUOTER: 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6
// - WMATIC_ADDRESS: 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270
// - USDC_WMATIC_POOL: 0xA374094527e1673A86dE625aa59517c5dE346d32

// TODO: Add method selector for transferWithPermit (0x36efd16f)

// ABIs
const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function nonces(address) view returns (uint256)',
]

const TRANSFER_ABI = [
  'function transferWithPermit(address token, uint256 amount, address target, uint256 fee, uint256 deadline, bytes32 sigR, bytes32 sigS, uint8 sigV)',
  'function getNonce(address) view returns (uint256)',
  'function getRequiredRelayGas(bytes4 methodId) view returns (uint256)',
]

const RELAY_HUB_ABI = [
  'event RelayServerRegistered(address indexed relayManager, uint256 baseRelayFee, uint256 pctRelayFee, string relayUrl)',
]

const UNISWAP_POOL_ABI = [
  'function fee() external view returns (uint24)',
]

const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
]

async function discoverRelays(provider) {
  const relayHub = new ethers.Contract(RELAY_HUB_ADDRESS, RELAY_HUB_ABI, provider)
  const currentBlock = await provider.getBlockNumber()
  const LOOKBACK_BLOCKS = 1600 // ~1 hour

  const events = await relayHub.queryFilter(
    relayHub.filters.RelayServerRegistered(),
    currentBlock - LOOKBACK_BLOCKS,
    currentBlock,
  )

  const relayMap = new Map()
  for (const event of events) {
    const { relayManager, baseRelayFee, pctRelayFee, relayUrl } = event.args
    relayMap.set(relayUrl, {
      url: relayUrl,
      manager: relayManager,
      baseRelayFee,
      pctRelayFee: pctRelayFee.toNumber(),
    })
  }

  return Array.from(relayMap.values())
}

async function validateRelay(relay, provider) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(`${relay.url}/getaddr`, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok)
      return null

    const relayInfo = await response.json()

    if (!relayInfo.version?.startsWith('2.'))
      return null
    if (relayInfo.networkId !== '137' && relayInfo.chainId !== '137')
      return null
    if (!relayInfo.ready)
      return null

    const workerBalance = await provider.getBalance(relayInfo.relayWorkerAddress)
    if (workerBalance.lt(ethers.utils.parseEther('0.01')))
      return null

    if (relay.pctRelayFee > 70)
      return null
    if (relay.baseRelayFee.gt(0))
      return null

    return {
      ...relay,
      relayWorkerAddress: relayInfo.relayWorkerAddress,
      minGasPrice: ethers.BigNumber.from(relayInfo.minGasPrice || 0),
      version: relayInfo.version,
    }
  }
  catch {
    return null
  }
}

async function getPolUsdcPrice(provider) {
  // TODO: Query Uniswap V3 pool for USDC/WMATIC price
  // 1. Create pool contract with USDC_WMATIC_POOL
  // 2. Create quoter contract with UNISWAP_QUOTER
  // 3. Get pool fee
  // 4. Call quoter.callStatic.quoteExactInputSingle with:
  //    - tokenIn: USDC_ADDRESS
  //    - tokenOut: WMATIC_ADDRESS
  //    - fee: pool fee
  //    - amountIn: 1 USDC (1e6)
  //    - sqrtPriceLimitX96: 0
  // 5. Return POL amount
}

async function calculateOptimalFee(relay, provider, transferContract, isMainnet = true) {
  const networkGasPrice = await provider.getGasPrice()

  console.log('  Network gas price:', ethers.utils.formatUnits(networkGasPrice, 'gwei'), 'gwei')
  console.log('  Relay min gas price:', ethers.utils.formatUnits(relay.minGasPrice, 'gwei'), 'gwei')

  const baseGasPrice = networkGasPrice.gt(relay.minGasPrice) ? networkGasPrice : relay.minGasPrice
  const bufferPercentage = isMainnet ? 110 : 125
  const bufferedGasPrice = baseGasPrice.mul(bufferPercentage).div(100)

  console.log('  Buffered gas price:', ethers.utils.formatUnits(bufferedGasPrice, 'gwei'), 'gwei', `(${bufferPercentage}%)`)

  // TODO: Get gas limit using METHOD_SELECTOR_TRANSFER_WITH_PERMIT
  // const gasLimit = await transferContract.getRequiredRelayGas(METHOD_SELECTOR_TRANSFER_WITH_PERMIT)

  // console.log('  Gas limit:', gasLimit.toString())

  // const baseCost = bufferedGasPrice.mul(gasLimit)
  // const costWithPctFee = baseCost.mul(100 + relay.pctRelayFee).div(100)
  // const totalPOLCost = costWithPctFee.add(relay.baseRelayFee)

  // console.log('  Total POL cost:', ethers.utils.formatEther(totalPOLCost), 'POL')
  // console.log('  Relay fee:', `${relay.pctRelayFee}%`)

  // TODO: Get POL/USDC price from Uniswap
  // const polPerUsdc = await getPolUsdcPrice(provider)

  // console.log('  Uniswap rate:', ethers.utils.formatEther(polPerUsdc), 'POL per USDC')

  // TODO: Convert POL fee to USDC with 10% buffer
  // const feeInUSDC = totalPOLCost.mul(1_000_000).div(polPerUsdc).mul(110).div(100)

  // console.log('  USDC fee:', ethers.utils.formatUnits(feeInUSDC, 6), 'USDC')

  // TODO: Return calculated values
  // return {
  //   usdcFee: feeInUSDC,
  //   gasPrice: bufferedGasPrice,
  //   gasLimit,
  //   polCost: totalPOLCost,
  // }
}

async function findBestRelay(provider, transferContract) {
  console.log('\n🔍 Discovering relays...')
  const relays = await discoverRelays(provider)
  console.log(`Found ${relays.length} unique relay URLs`)

  console.log('\n🔬 Validating and calculating fees...\n')

  let bestRelay = null
  let lowestFee = ethers.constants.MaxUint256

  for (const relay of relays) {
    const validRelay = await validateRelay(relay, provider)

    if (!validRelay)
      continue

    console.log(`📊 ${relay.url}`)

    try {
      const feeData = await calculateOptimalFee(validRelay, provider, transferContract)

      if (feeData.usdcFee.lt(lowestFee)) {
        lowestFee = feeData.usdcFee
        bestRelay = { ...validRelay, feeData }
        console.log('  ✅ New best relay!\n')
      }
      else {
        console.log('  ⚪ Not the cheapest\n')
      }
    }
    catch (error) {
      console.log('  ❌ Fee calculation failed:', error.message, '\n')
    }
  }

  if (!bestRelay) {
    throw new Error('No valid relays found')
  }

  return bestRelay
}

async function main() {
  console.log('🚀 Gasless USDC transfer with EIP-2612 Permit...\n')

  const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

  console.log('🔑 Sender:', wallet.address)
  console.log('📍 Receiver:', RECEIVER_ADDRESS)

  const transferContract = new ethers.Contract(TRANSFER_CONTRACT_ADDRESS, TRANSFER_ABI, provider)

  const relay = await findBestRelay(provider, transferContract)

  console.log('\n✅ Selected relay:', relay.url)
  console.log('   Worker:', relay.relayWorkerAddress)
  console.log('   Optimized USDC fee:', ethers.utils.formatUnits(relay.feeData.usdcFee, 6), 'USDC')
  console.log('   Gas price:', ethers.utils.formatUnits(relay.feeData.gasPrice, 'gwei'), 'gwei')

  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
  const usdcNonce = await usdc.nonces(wallet.address)

  const transferAmount = ethers.utils.parseUnits(TRANSFER_AMOUNT_USDC, 6)
  const feeAmount = relay.feeData.usdcFee
  const approvalAmount = transferAmount.add(feeAmount)

  console.log('\n💰 Transfer:', TRANSFER_AMOUNT_USDC, 'USDC')
  console.log('💸 Optimized fee:', ethers.utils.formatUnits(feeAmount, 6), 'USDC')
  console.log('✅ Total approval:', ethers.utils.formatUnits(approvalAmount, 6), 'USDC')

  // TODO: Sign EIP-2612 Permit
  // Domain:
  //   name: 'USD Coin'
  //   version: '2'
  //   chainId: 137
  //   verifyingContract: USDC_ADDRESS
  //
  // Types:
  //   Permit: [
  //     { name: 'owner', type: 'address' },
  //     { name: 'spender', type: 'address' },
  //     { name: 'value', type: 'uint256' },
  //     { name: 'nonce', type: 'uint256' },
  //     { name: 'deadline', type: 'uint256' },
  //   ]
  //
  // Message:
  //   owner: wallet.address
  //   spender: TRANSFER_CONTRACT_ADDRESS
  //   value: approvalAmount
  //   nonce: usdcNonce.toNumber()
  //   deadline: ethers.constants.MaxUint256

  // TODO: Build transfer calldata with transferWithPermit
  // Parameters: [token, amount, target, fee, deadline, r, s, v]

  // TODO: Build relay request (same as Lesson 6)

  // TODO: Sign relay request (same as Lesson 6)

  // TODO: Submit to relay (same as Lesson 6)
  // const txHash = ...

  console.log('\n✅ Gasless USDC transaction sent!')
  // console.log('🔗 View:', `https://polygonscan.com/tx/${txHash}`)
  console.log('\n💡 Key differences from USDT:')
  console.log('   ✅ EIP-2612 Permit (not meta-transaction)')
  console.log('   ✅ Version-based domain separator')
  console.log('   ✅ transferWithPermit method (not transferWithApproval)')
  console.log('   ✅ Deadline parameter (not functionSignature)')
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message)
})
