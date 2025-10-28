import { ethers } from 'ethers'

async function main() {
  console.log('🔐 Generating New Polygon Mainnet Wallet\n')

  // Create a random wallet
  const wallet = ethers.Wallet.createRandom()

  console.log('✅ Wallet Created!')
  console.log('├─ Address:', wallet.address)

  // Display private key with warning
  console.log('\n🔑 Private Key (keep this SECRET):')
  console.log('   ', wallet.privateKey)

  // Display mnemonic phrase
  console.log('\n📝 24-Word Mnemonic Phrase (keep this SECRET):')
  console.log('   ', wallet.mnemonic.phrase)

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
