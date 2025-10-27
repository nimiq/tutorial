export const POLYGON_RPC_URL = 'https://polygon-rpc.com'

// Native USDC on Polygon mainnet
export const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
export const USDC_DECIMALS = 6

export const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)'
]

export const TRANSFER_AMOUNT = '0.01'
export const RECIPIENT_ADDRESS = '0xA3E49ef624bEaC43D29Af86bBFdE975Abaa0E184'

export const EXPLORER_BASE_URL = 'https://polygonscan.com/tx/'
