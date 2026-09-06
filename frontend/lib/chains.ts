import { type Chain } from 'viem';

/* ── Robinhood Chain (not yet in wagmi/chains) ─────────── */
export const robinhood: Chain = {
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://robinhoodchain.blockscout.com',
    },
  },
  testnet: false,
};

/* ── Re-export Base chains for convenience ─────────────── */
export { base, baseSepolia } from 'wagmi/chains';

/* ── Chain helper maps ─────────────────────────────────── */
export const BASE_CHAIN_ID = 8453;
export const ROBINHOOD_CHAIN_ID = 4663;

export const SUPPORTED_CHAIN_IDS = [BASE_CHAIN_ID, ROBINHOOD_CHAIN_ID] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

export function getExplorerUrl(chainId: number): string {
  switch (chainId) {
    case ROBINHOOD_CHAIN_ID:
      return 'https://robinhoodchain.blockscout.com';
    default:
      return 'https://basescan.org';
  }
}

export function getExplorerName(chainId: number): string {
  switch (chainId) {
    case ROBINHOOD_CHAIN_ID:
      return 'Blockscout';
    default:
      return 'Basescan';
  }
}
