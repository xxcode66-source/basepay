'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { useState, useEffect, type ReactNode } from 'react';
import { config } from '@/lib/wagmi';

// Note: When running inside Nimiq Pay, the injected window.ethereum provider
// is used directly for wallet connections. RainbowKit serves as fallback for
// regular browsers. Nimiq Pay detection happens at the page/component level
// via isNimiqPay() from lib/nimiq.ts. This Wagmi provider is always active
// for contract reads (TipHistory, basenames, etc.).

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // Register service worker for PWA support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#0052FF', // Base blue
            accentColorForeground: 'white',
            borderRadius: 'large',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
