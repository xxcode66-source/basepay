'use client';

import { useState, useEffect } from 'react';
import { init } from '@nimiq/mini-app-sdk';

/* ── Nimiq Provider Types ────────────────────────────────── */
interface NimiqTransactionRequest {
  recipient: string;
  value: number;
  data?: string;
}

interface NimiqProvider {
  listAccounts: () => Promise<string[]>;
  sendBasicTransaction: (req: NimiqTransactionRequest) => Promise<string>;
  sendBasicTransactionWithData: (req: NimiqTransactionRequest) => Promise<string>;
}

export function isNimiqPay(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { nimiqPay: unknown }).nimiqPay;
}

export function getUserLanguage(): string {
  if (typeof window !== 'undefined' && (window as unknown as { nimiqPay?: { language?: string } }).nimiqPay?.language) {
    return (window as unknown as { nimiqPay: { language: string } }).nimiqPay.language;
  }
  return typeof navigator !== 'undefined' ? navigator.language : 'en';
}

export function useNimiqProvider() {
  const [nimiq, setNimiq] = useState<NimiqProvider | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNimiqPay()) return;

    let cancelled = false;

    async function setup() {
      try {
        const provider = await init() as unknown as NimiqProvider;
        if (cancelled) return;
        setNimiq(provider);

        const accs = await provider.listAccounts();
        if (cancelled) return;
        const accList = Array.isArray(accs) ? accs : [];
        setAccounts(accList);
        setIsReady(true);
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to initialize Nimiq provider';
          setError(message);
        }
      }
    }

    setup();
    return () => { cancelled = true; };
  }, []);

  return { nimiq, accounts, isReady, error };
}
