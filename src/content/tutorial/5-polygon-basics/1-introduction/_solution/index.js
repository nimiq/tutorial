import { ethers } from 'ethers'
import { createWalletFromPassword } from './lib/wallet.js'

const RPC_URL = 'https://rpc-amoy.polygon.technology'
const USDC_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'
const USDC_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
]

// 🔐 WALLET SETUP: Change this to your own unique password!
// Same password = same wallet address every time (great for tutorials)
const WALLET_PASSWORD = 'change_me_to_something_unique_like_pizza_unicorn_2024'

// 📤 RECIPIENT: This is a Nimiq-controlled account that collects tutorial demo transfers
// If you accidentally send large amounts or want your funds back, contact us and we'll return them!
//
// 💡 Want to send to yourself instead? Uncomment these lines to create a second wallet:
// const recipientWallet = createWalletFromPassword('my_second_wallet_password_banana_2024')
// const RECIPIENT = recipientWallet.address
// This way you control both wallets and can recover any funds sent!
//
// Or create your own wallet with a standard 24-word mnemonic (see lib/wallet.js)
const RECIPIENT = '0xA3E49ef624bEaC43D29Af86bBFdE975Abaa0E184'

async function main() {
  console.log('🚀 Polygon Basics - Complete Demo\n')
  console.log('This demo shows all concepts from lessons 2-4:\n')

  // ========== LESSON 2: WALLET SETUP & FAUCETS ==========
  console.log('📚 LESSON 2: Wallet Setup & Faucets')
  console.log('─'.repeat(50))

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL)

  // Create wallet from password (see lib/wallet.js for alternatives)
  const wallet = createWalletFromPassword(WALLET_PASSWORD).connect(provider)
  console.log('✅ Wallet created from password')

  if (WALLET_PASSWORD === 'change_me_to_something_unique_like_pizza_unicorn_2024') {
    console.log('⚠️  Using default password! Change WALLET_PASSWORD to your own unique string.')
  }

  console.log('📍 Address:', wallet.address)
  console.log('🔗 View on explorer:', `https://amoy.polygonscan.com/address/${wallet.address}`)

  // Check balances
  const polBalance = await provider.getBalance(wallet.address)
  console.log('💰 POL Balance:', ethers.utils.formatEther(polBalance), 'POL')

  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet)
  const usdcBalance = await usdc.balanceOf(wallet.address)
  const decimals = await usdc.decimals()
  console.log('💵 USDC Balance:', ethers.utils.formatUnits(usdcBalance, decimals), 'USDC')

  // Convert to 24-word mnemonic so you can import into any wallet
  const mnemonic = ethers.Wallet.fromMnemonic(
    ethers.utils.entropyToMnemonic(ethers.utils.hexZeroPad(wallet.privateKey, 32))
  ).mnemonic.phrase
  console.log('\n📝 Mnemonic (24 words):', mnemonic)
  console.log('💡 You can import this mnemonic into any wallet to check your balances:')
  console.log('   • Nimiq Testnet Wallet: https://wallet.nimiq-testnet.com/ (supports Amoy USDC)')
  console.log('   • Note: Nimiq Wallet does not support POL, only USDC/USDT')
  console.log('   • Or use MetaMask, Trust Wallet, etc.\n')

  if (polBalance.eq(0)) {
    console.log('\n⚠️  No POL found! Get free tokens from:')
    console.log('   POL & USDC: https://faucet.polygon.technology/')
    console.log('   USDC also:  https://faucet.circle.com/')
    console.log('   Then run this demo again!\n')
    return
  }

  // ========== LESSON 3: SENDING POL ==========
  console.log('\n📚 LESSON 3: Sending POL Transactions')
  console.log('─'.repeat(50))

  const POL_AMOUNT = '0.0001' // Minimal amount for demo

  console.log('📤 Sending', POL_AMOUNT, 'POL to', RECIPIENT)

  try {
    // Get current gas price and ensure minimum for Polygon
    const feeData = await provider.getFeeData()
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.lt(ethers.utils.parseUnits('30', 'gwei'))
      ? ethers.utils.parseUnits('30', 'gwei')
      : feeData.maxPriorityFeePerGas

    // Ensure maxFeePerGas is higher than maxPriorityFeePerGas
    const maxFeePerGas = feeData.maxFeePerGas.lt(maxPriorityFeePerGas)
      ? maxPriorityFeePerGas.mul(2)
      : feeData.maxFeePerGas

    const tx = await wallet.sendTransaction({
      to: RECIPIENT,
      value: ethers.utils.parseEther(POL_AMOUNT),
      maxPriorityFeePerGas,
      maxFeePerGas
    })
    console.log('⏳ Transaction hash:', tx.hash)

    const receipt = await tx.wait()
    console.log('✅ Confirmed in block:', receipt.blockNumber)
    console.log('⛽ Gas used:', receipt.gasUsed.toString())
    console.log('🔗 View:', `https://amoy.polygonscan.com/tx/${tx.hash}`)

    // Show balance change
    const newPolBalance = await provider.getBalance(wallet.address)
    const spent = polBalance.sub(newPolBalance)
    console.log('📊 Total spent:', ethers.utils.formatEther(spent), 'POL (including gas)')
  } catch (error) {
    console.log('❌ Failed:', error.message)
  }

  // ========== LESSON 4: ERC20 & USDC ==========
  console.log('\n📚 LESSON 4: ERC20 Tokens & USDC Transfers')
  console.log('─'.repeat(50))

  if (usdcBalance.eq(0)) {
    console.log('⚠️  No USDC found! Get free USDC from:')
    console.log('   https://faucet.polygon.technology/')
    console.log('   https://faucet.circle.com/')
    console.log('   Then try this section again!\n')
    return
  }

  const USDC_AMOUNT = '0.01' // Minimal amount for demo
  console.log('📤 Sending', USDC_AMOUNT, 'USDC to', RECIPIENT)

  try {
    // Get current gas price and ensure minimum for Polygon
    const feeData = await provider.getFeeData()
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.lt(ethers.utils.parseUnits('30', 'gwei'))
      ? ethers.utils.parseUnits('30', 'gwei')
      : feeData.maxPriorityFeePerGas

    // Ensure maxFeePerGas is higher than maxPriorityFeePerGas
    const maxFeePerGas = feeData.maxFeePerGas.lt(maxPriorityFeePerGas)
      ? maxPriorityFeePerGas.mul(2)
      : feeData.maxFeePerGas

    const amountInBaseUnits = ethers.utils.parseUnits(USDC_AMOUNT, decimals)
    const tx = await usdc.transfer(RECIPIENT, amountInBaseUnits, {
      maxPriorityFeePerGas,
      maxFeePerGas
    })
    console.log('⏳ Transaction hash:', tx.hash)

    const receipt = await tx.wait()
    console.log('✅ Confirmed in block:', receipt.blockNumber)
    console.log('🔗 View:', `https://amoy.polygonscan.com/tx/${tx.hash}`)

    // Show balance change
    const newUsdcBalance = await usdc.balanceOf(wallet.address)
    console.log('📊 New USDC balance:', ethers.utils.formatUnits(newUsdcBalance, decimals), 'USDC')

    const recipientBalance = await usdc.balanceOf(RECIPIENT)
    console.log('📊 Recipient USDC:', ethers.utils.formatUnits(recipientBalance, decimals), 'USDC')

    // Show POL used for gas (still needed for ERC20!)
    const finalPolBalance = await provider.getBalance(wallet.address)
    console.log('⛽ POL balance:', ethers.utils.formatEther(finalPolBalance), 'POL (gas paid in POL!)')
  } catch (error) {
    console.log('❌ Failed:', error.message)
  }

  console.log('\n🎉 Demo complete! Now try lessons 2-4 step by step.')
}

main().catch(console.error)
