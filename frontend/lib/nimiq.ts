'use client';

import { useState, useEffect } from 'react';
import { init } from '@nimiq/mini-app-sdk';

export function isNimiqPay(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).nimiqPay;
}

export function getUserLanguage(): string {
  if (typeof window !== 'undefined' && (window as any).nimiqPay?.language) {
    return (window as any).nimiqPay.language;
  }
  return typeof navigator !== 'undefined' ? navigator.language : 'en';
}

export function useNimiqProvider() {
  const [nimiq, setNimiq] = useState<any>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNimiqPay()) return;

    let cancelled = false;

    async function setup() {
      try {
        const provider = await init();
        if (cancelled) return;
        setNimiq(provider);

        const accs = await provider.listAccounts();
        if (cancelled) return;
        // Ensure accs is an array
        const accList = Array.isArray(accs) ? accs : [];
        setAccounts(accList);
        setIsReady(true);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to initialize Nimiq provider');
        }
      }
    }

    setup();
    return () => { cancelled = true; };
  }, []);

  return { nimiq, accounts, isReady, error };
}
