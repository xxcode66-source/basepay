import { BASE_CHAIN_ID, ROBINHOOD_CHAIN_ID } from './chains';

/* ══════════════════════════════════════════════════════════
   Multi-chain contract addresses
   ══════════════════════════════════════════════════════════ */

interface ChainConfig {
  tipRouterAddress: `0x${string}`;
  tipRouterUsdtAddress: `0x${string}`;
  usdcAddress: `0x${string}`;
  usdtAddress: `0x${string}`;
  usdgAddress: `0x${string}`;
  rpcUrl: string;
  explorerUrl: string;
}

const chainConfigs: Record<number, ChainConfig> = {
  /* ── Base Mainnet ──────────────────────────────────────── */
  [BASE_CHAIN_ID]: {
    tipRouterAddress: (process.env.NEXT_PUBLIC_TIP_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    tipRouterUsdtAddress: (process.env.NEXT_PUBLIC_TIP_ROUTER_USDT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    usdcAddress: (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') as `0x${string}`,
    usdtAddress: (process.env.NEXT_PUBLIC_USDT_ADDRESS || '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2') as `0x${string}`,
    usdgAddress: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
  },

  /* ── Robinhood Chain ───────────────────────────────────── */
  [ROBINHOOD_CHAIN_ID]: {
    tipRouterAddress: (process.env.NEXT_PUBLIC_RH_TIP_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    tipRouterUsdtAddress: (process.env.NEXT_PUBLIC_RH_TIP_ROUTER_USDT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    usdcAddress: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    usdtAddress: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    usdgAddress: (process.env.NEXT_PUBLIC_USDG_ADDRESS || '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168') as `0x${string}`,
    rpcUrl: process.env.NEXT_PUBLIC_RH_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com',
    explorerUrl: 'https://robinhoodchain.blockscout.com',
  },
};

/* ── Get config for a specific chain ───────────────────── */
export function getChainConfig(chainId: number): ChainConfig {
  return chainConfigs[chainId] || chainConfigs[BASE_CHAIN_ID];
}

/* ── Legacy exports (backward compat — defaults to Base) ── */
export const TIP_ROUTER_ADDRESS = chainConfigs[BASE_CHAIN_ID].tipRouterAddress;
export const USDC_ADDRESS = chainConfigs[BASE_CHAIN_ID].usdcAddress;
export const USDC_DECIMALS = 6;

export const TIP_ROUTER_USDT_ADDRESS = chainConfigs[BASE_CHAIN_ID].tipRouterUsdtAddress;
export const USDT_ADDRESS = chainConfigs[BASE_CHAIN_ID].usdtAddress;
export const USDT_DECIMALS = 6;

export const BASE_RPC_URL = chainConfigs[BASE_CHAIN_ID].rpcUrl;

/* ── USDG (Robinhood Chain) ────────────────────────────── */
export const USDG_ADDRESS = chainConfigs[ROBINHOOD_CHAIN_ID].usdgAddress;
export const USDG_DECIMALS = 6;

/* ══════════════════════════════════════════════════════════
   ABIs
   ══════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════════════════════════════════
   Permit helpers
   ══════════════════════════════════════════════════════════ */

export const USDC_PERMIT_DOMAIN = (usdcAddress: `0x${string}`, chainId: number) => ({
  name: 'USD Coin', version: '2', chainId, verifyingContract: usdcAddress,
}) as const;

// USDG uses different domain: name = "Global Dollar", version = "1"
export const USDG_PERMIT_DOMAIN = (usdgAddress: `0x${string}`, chainId: number) => ({
  name: 'Global Dollar', version: '1', chainId, verifyingContract: usdgAddress,
}) as const;

export const USDC_PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' }, { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' },
  ],
} as const;
