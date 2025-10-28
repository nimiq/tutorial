import { ethers } from 'ethers'

async function main() {
  console.log('🔐 Generating New Polygon Mainnet Wallet\n')

  // TODO: Create a random wallet using ethers.Wallet.createRandom()

  // TODO: Display the wallet address

  // TODO: Display the private key with a security warning

  // TODO: Display the 24-word mnemonic phrase

  console.log('\n⚠️  IMPORTANT: Save these credentials securely!')
  console.log('• Never share your private key or mnemonic')
  console.log('• Store them in a password manager or secure location')
  console.log('• Anyone with these can access your funds')

  console.log('\n💡 TIP: Import your 24 words into Nimiq Wallet')
  console.log('   Visit: https://wallet.nimiq.com')
  console.log('   For a better user experience managing this wallet')

  console.log('\n💰 Get Mainnet Funds:')
  console.log('• USDC: https://faucet.circle.com/')
  console.log('• POL: https://faucet.polygon.technology/')
  console.log('• USDT: No faucet available - purchase on exchange')
}

main().catch(console.error)
