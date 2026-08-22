export const TIP_ROUTER_ADDRESS = process.env
  .NEXT_PUBLIC_TIP_ROUTER_ADDRESS as `0x${string}`;

export const USDC_ADDRESS = process.env
  .NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

if (process.env.NODE_ENV !== 'production') {
  if (!TIP_ROUTER_ADDRESS || TIP_ROUTER_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.warn('[BasePay] NEXT_PUBLIC_TIP_ROUTER_ADDRESS is not set. Set it in .env.local.');
  }
  if (!USDC_ADDRESS) {
    console.warn('[BasePay] NEXT_PUBLIC_USDC_ADDRESS is not set. Set it in .env.local.');
  }
}

export const USDC_DECIMALS = 6;

/** ABI minimal — hanya fungsi yang dipakai frontend, biar bundle ringan. */
export const TIP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'tip',
    inputs: [
      { name: '_streamer', type: 'address' },
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'PLATFORM_FEE_BPS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'TipSent',
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'streamer', type: 'address', indexed: true },
      { name: 'totalAmount', type: 'uint256', indexed: false },
      { name: 'feeAmount', type: 'uint256', indexed: false },
      { name: 'streamerAmount', type: 'uint256', indexed: false },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
