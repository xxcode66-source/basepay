export const TIP_ROUTER_ADDRESS = process.env.NEXT_PUBLIC_TIP_ROUTER_ADDRESS as `0x${string}`;
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as `0x${string}`;
export const USDC_DECIMALS = 6;

export const TIP_ROUTER_ABI = [{
  type: 'function', name: 'tip',
  inputs: [
    { name: '_streamer', type: 'address' }, { name: '_amount', type: 'uint256' },
    { name: '_feeNonce', type: 'uint256' }, { name: '_streamerNonce', type: 'uint256' },
    { name: '_deadline', type: 'uint256' }, { name: '_feeSig', type: 'bytes' }, { name: '_streamerSig', type: 'bytes' },
  ], outputs: [], stateMutability: 'nonpayable',
}, { type: 'function', name: 'PLATFORM_FEE_BPS', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }, {
  type: 'event', name: 'TipSent', inputs: [
    { name: 'sender', type: 'address', indexed: true }, { name: 'streamer', type: 'address', indexed: true },
    { name: 'totalAmount', type: 'uint256', indexed: false }, { name: 'feeAmount', type: 'uint256', indexed: false }, { name: 'streamerAmount', type: 'uint256', indexed: false },
  ],
}] as const;

export const PERMIT2_ABI = [{ type: 'function', name: 'allowance', inputs: [
  { name: 'owner', type: 'address' }, { name: 'token', type: 'address' }, { name: 'spender', type: 'address' },
], outputs: [{ name: 'amount', type: 'uint160' }, { name: 'expiration', type: 'uint48' }, { name: 'nonce', type: 'uint48' }], stateMutability: 'view' }] as const;

export const ERC20_ABI = [
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

export const PERMIT2_DOMAIN = { name: 'Permit2', chainId: 8453, verifyingContract: PERMIT2_ADDRESS } as const;
export const PERMIT2_TYPES = {
  PermitTransferFrom: [{ name: 'permitted', type: 'TokenPermissions' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }],
  TokenPermissions: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }],
} as const;