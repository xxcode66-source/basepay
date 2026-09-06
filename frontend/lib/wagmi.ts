import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, robinhood } from './chains';

export const config = getDefaultConfig({
  appName: 'BaseTip',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [base, baseSepolia, robinhood],
  ssr: true,
});
