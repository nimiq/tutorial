import { HttpClient, HttpWrapper } from '@opengsn/common'
import { TypedRequestData } from '@opengsn/common/dist/EIP712/TypedRequestData.js'
import { ethers } from 'ethers'

// 🔐 Paste your private key from Lesson 1 here!
const PRIVATE_KEY = '0xPASTE_YOUR_PRIVATE_KEY_HERE_FROM_LESSON_1'

// Mainnet addresses
const POLYGON_RPC_URL = 'https://polygon-rpc.com'
const USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
const TRANSFER_CONTRACT_ADDRESS = '0x98E69a6927747339d5E543586FC0262112eBe4BD' // USDT Transfer (Forwarder+Paymaster)
const RELAY_HUB_ADDRESS = '0x6C28AfC105e65782D9Ea6F2cA68df84C9e7d750d' // RelayHub v2.2.6
const RECEIVER_ADDRESS = '0xA3E49ef624bEaC43D29Af86bBFdE975Abaa0E184' // Nimiq-controlled

// Static relay (example - check if active)
const RELAY_URL = 'https://polygon-mainnet-relay.nimiq-network.com'

const TRANSFER_AMOUNT_USDT = '0.01' // Minimal amount
const STATIC_FEE_USDT = '0.01' // Static relay fee

// ABIs
const USDT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address, uint256) returns (bool)',
  'function executeMetaTransaction(address from, bytes functionSignature, bytes32 sigR, bytes32 sigS, uint8 sigV) payable returns (bytes)',
  'function nonces(address) view returns (uint256)',
]

const TRANSFER_ABI = [
  'function transferWithApproval(address token, uint256 amount, address target, uint256 fee, uint256 approval, bytes32 sigR, bytes32 sigS, uint8 sigV)',
  'function getNonce(address) view returns (uint256)',
]

async function main() {
  console.log('🚀 Starting gasless USDT transfer with static relay...\n')

  const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

  console.log('🔑 Sender:', wallet.address)
  console.log('📍 Receiver:', RECEIVER_ADDRESS)
  console.log('🔗 Relay:', RELAY_URL)

  // Step 1: Get USDT nonce
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider)
  const usdtNonce = await usdt.nonces(wallet.address)

  console.log('\n📝 USDT Nonce:', usdtNonce.toString())

  // Step 2: Calculate approval amount
  const transferAmount = ethers.utils.parseUnits(TRANSFER_AMOUNT_USDT, 6)
  const feeAmount = ethers.utils.parseUnits(STATIC_FEE_USDT, 6)
  const approvalAmount = transferAmount.add(feeAmount)

  console.log('💰 Transfer:', TRANSFER_AMOUNT_USDT, 'USDT')
  console.log('💸 Fee:', STATIC_FEE_USDT, 'USDT')
  console.log('✅ Total approval:', ethers.utils.formatUnits(approvalAmount, 6), 'USDT')

  // Step 3: Sign USDT approval (EIP-712 MetaTransaction)
  const approveFunctionSignature = usdt.interface.encodeFunctionData('approve', [
    TRANSFER_CONTRACT_ADDRESS,
    approvalAmount,
  ])

  const usdtDomain = {
    name: 'USDT0',
    version: '1',
    verifyingContract: USDT_ADDRESS,
    salt: ethers.utils.hexZeroPad(ethers.utils.hexlify(137), 32), // chainId as salt
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

  console.log('\n✍️  USDT approval signed')

  // Step 4: Build transfer calldata
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

  console.log('📦 Transfer calldata encoded')

  // Step 5: Get forwarder nonce
  const forwarderNonce = await transferContract.getNonce(wallet.address)
  const currentBlock = await provider.getBlockNumber()
  const validUntil = currentBlock + (2 * 60 * 2) // 2 hours (2 blocks/min * 60 min * 2)

  console.log('🔢 Forwarder nonce:', forwarderNonce.toString())

  // Step 6: Build relay request
  const relayRequest = {
    request: {
      from: wallet.address,
      to: TRANSFER_CONTRACT_ADDRESS,
      value: '0',
      gas: '350000', // Static gas limit
      nonce: forwarderNonce.toString(),
      data: transferCalldata,
      validUntil: validUntil.toString(),
    },
    relayData: {
      gasPrice: '100000000000', // 100 gwei - static!
      pctRelayFee: '0',
      baseRelayFee: '0',
      relayWorker: '0x0000000000000000000000000000000000000000', // Will be filled by relay
      paymaster: TRANSFER_CONTRACT_ADDRESS,
      forwarder: TRANSFER_CONTRACT_ADDRESS,
      paymasterData: '0x',
      clientId: '1',
    },
  }

  // Step 7: Sign relay request
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

  console.log('✍️  Relay request signed')

  // Step 8: Get relay worker address
  console.log('\n🔍 Pinging relay...')
  const relayInfo = await fetch(`${RELAY_URL}/getaddr`).then(r => r.json())

  if (!relayInfo.ready) {
    throw new Error('Relay is not ready')
  }

  console.log('✅ Relay ready, worker:', relayInfo.relayWorkerAddress)

  // Update relayWorker in the request
  relayRequest.relayData.relayWorker = relayInfo.relayWorkerAddress

  // Step 9: Get current relay nonce
  const relayNonce = await provider.getTransactionCount(relayInfo.relayWorkerAddress)

  // Step 10: Submit to relay
  console.log('\n📡 Submitting to relay...')

  const httpClient = new HttpClient(new HttpWrapper(), console)
  const relayResponse = await httpClient.relayTransaction(RELAY_URL, {
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
  console.log('\n💡 Your wallet POL balance was NOT spent!')
  console.log('   The relay paid the gas and was reimbursed in USDT.')
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message)
})
