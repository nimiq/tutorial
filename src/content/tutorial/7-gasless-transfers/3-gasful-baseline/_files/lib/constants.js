export const USDT_DECIMALS = 6;

export const POLYGON_CONFIG = {
  usdtTokenAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  explorerBaseUrl: 'https://polygonscan.com/tx/',
  nativeSymbol: 'MATIC'
};

export const USDT_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
];
