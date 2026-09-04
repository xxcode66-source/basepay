// USDC Router (existing)
export const TIP_ROUTER_ADDRESS = process.env.NEXT_PUBLIC_TIP_ROUTER_ADDRESS as `0x${string}`;
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
export const USDC_DECIMALS = 6;

// USDT Router (new)
export const TIP_ROUTER_USDT_ADDRESS = process.env.NEXT_PUBLIC_TIP_ROUTER_USDT_ADDRESS as `0x${string}`;
export const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`;
export const USDT_DECIMALS = 6;

// Base RPC URL (configurable via env)
export const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

export const TIP_ROUTER_ABI = [{
  type: 'function', name: 'tip',
  inputs: [
    { name: '_streamer', type: 'address' }, { name: '_amount', type: 'uint256' },
    { name: '_deadline', type: 'uint256' }, { name: '_nonce', type: 'uint256' },
    { name: '_v', type: 'uint8' }, { name: '_r', type: 'bytes32' }, { name: '_s', type: 'bytes32' }, { name: '_message', type: 'string' },
  ], outputs: [], stateMutability: 'nonpayable',
}, { type: 'function', name: 'PLATFORM_FEE_BPS', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }, {
  type: 'event', name: 'TipSent', inputs: [
    { name: 'sender', type: 'address', indexed: true }, { name: 'streamer', type: 'address', indexed: true },
    { name: 'totalAmount', type: 'uint256', indexed: false }, { name: 'feeAmount', type: 'uint256', indexed: false }, { name: 'streamerAmount', type: 'uint256', indexed: false },
  ],
}, { type: 'event', name: 'TipAlert', inputs: [
  { name: 'sender', type: 'address', indexed: true }, { name: 'streamer', type: 'address', indexed: true },
  { name: 'streamerAmount', type: 'uint256', indexed: false }, { name: 'message', type: 'string', indexed: false },
  ],
}] as const;

export const TIP_ROUTER_USDT_ABI = [{
  type: 'function', name: 'tip',
  inputs: [
    { name: '_streamer', type: 'address' }, { name: '_amount', type: 'uint256' },
    { name: '_message', type: 'string' },
  ], outputs: [], stateMutability: 'nonpayable',
}, { type: 'function', name: 'PLATFORM_FEE_BPS', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }, {
  type: 'event', name: 'TipSent', inputs: [
    { name: 'sender', type: 'address', indexed: true }, { name: 'streamer', type: 'address', indexed: true },
    { name: 'totalAmount', type: 'uint256', indexed: false }, { name: 'feeAmount', type: 'uint256', indexed: false }, { name: 'streamerAmount', type: 'uint256', indexed: false },
  ],
}, { type: 'event', name: 'TipAlert', inputs: [
  { name: 'sender', type: 'address', indexed: true }, { name: 'streamer', type: 'address', indexed: true },
  { name: 'streamerAmount', type: 'uint256', indexed: false }, { name: 'message', type: 'string', indexed: false },
  ],
}] as const;

export const ERC20_ABI = [
  { type: 'function', name: 'nonces', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

export const ERC20_APPROVE_ABI = [
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

export const USDC_PERMIT_DOMAIN = (usdcAddress: `0x${string}`, chainId: number) => ({
  name: 'USD Coin', version: '2', chainId, verifyingContract: usdcAddress,
}) as const;

export const USDC_PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' }, { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' },
  ],
} as const;