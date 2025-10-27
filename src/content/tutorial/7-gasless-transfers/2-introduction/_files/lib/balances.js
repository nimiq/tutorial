import { ethers } from 'ethers'
import { USDT_ABI, USDT_ADDRESS, USDT_DECIMALS } from './config.js'

export async function checkBalances(provider, wallet) {
  const polBalance = await provider.getBalance(wallet.address)

  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider)
  const usdtBalance = await usdt.balanceOf(wallet.address)

  return {
    pol: polBalance,
    usdt: usdtBalance,
    polFormatted: ethers.utils.formatEther(polBalance),
    usdtFormatted: ethers.utils.formatUnits(usdtBalance, USDT_DECIMALS),
  }
}
