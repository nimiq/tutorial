import { ethers } from 'ethers'

/**
 * Creates a wallet from a password string.
 *
 * WHY USE THIS?
 * - You can recreate the same wallet anytime by using the same password
 * - No need to save private keys in files or worry about losing them
 * - Just remember your password and you can access your wallet from any code
 *
 * HOW IT WORKS:
 * - Your password is hashed (keccak256) to create a deterministic private key
 * - Same password = same private key = same wallet address every time
 *
 * SECURITY NOTE:
 * - This is PERFECT for testnets (learning, experiments)
 * - For mainnet with real money, use a hardware wallet or proper mnemonic phrase
 */
export function createWalletFromPassword(password) {
  // Hash the password to get a deterministic private key
  const privateKey = ethers.utils.id(password)
  const wallet = new ethers.Wallet(privateKey)

  return wallet
}

/**
 * Alternative wallet creation methods:
 *
 * 1. FROM MNEMONIC (12/24 word phrase):
 *    const mnemonic = "word1 word2 word3 ... word12"
 *    const wallet = ethers.Wallet.fromMnemonic(mnemonic)
 *
 * 2. FROM PRIVATE KEY (hex string):
 *    const privateKey = "0x1234567890abcdef..."
 *    const wallet = new ethers.Wallet(privateKey)
 *
 * 3. RANDOM WALLET (new every time):
 *    const wallet = ethers.Wallet.createRandom()
 *    console.log('Save this mnemonic:', wallet.mnemonic.phrase)
 *
 * 4. FROM PASSWORD (this method - best for tutorials):
 *    const wallet = createWalletFromPassword("my_unique_password_123")
 */
