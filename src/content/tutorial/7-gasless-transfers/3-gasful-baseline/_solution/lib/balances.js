import { ethers } from 'ethers';
import { POLYGON_CONFIG, USDT_ABI, USDT_DECIMALS } from './constants.js';

export async function checkBalances(provider, wallet, receiverAddress) {
  const polBalance = await provider.getBalance(wallet.address);

  const usdt = new ethers.Contract(
    POLYGON_CONFIG.usdtTokenAddress,
    USDT_ABI,
    wallet
  );

  const [senderUsdt, receiverUsdt] = await Promise.all([
    usdt.balanceOf(wallet.address),
    usdt.balanceOf(receiverAddress)
  ]);

  return {
    sender: {
      pol: polBalance,
      usdt: senderUsdt,
      polFormatted: ethers.utils.formatEther(polBalance),
      usdtFormatted: ethers.utils.formatUnits(senderUsdt, USDT_DECIMALS)
    },
    receiver: {
      usdt: receiverUsdt,
      usdtFormatted: ethers.utils.formatUnits(receiverUsdt, USDT_DECIMALS)
    }
  };
}
