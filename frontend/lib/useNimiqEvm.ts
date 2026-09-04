'use client';

import { useState, useEffect } from 'react';
import { isNimiqPay } from './nimiq';

export function useNimiqEvm() {
  const [ethereum, setEthereum] = useState<any>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isNimiqPay()) return;
    const eth = (window as any).ethereum;
    if (!eth) return;
    setEthereum(eth);

    // Request accounts
    eth.request({ method: 'eth_requestAccounts' })
      .then((accs: string[]) => {
        setAccounts(accs);
        return eth.request({ method: 'eth_chainId' });
      })
      .then((cid: string) => {
        setChainId(cid);
        setIsReady(true);
      })
      .catch(() => {});

    // Listen for chain/account changes
    const handleChainChanged = (cid: string) => setChainId(cid);
    const handleAccountsChanged = (accs: string[]) => setAccounts(accs);
    eth.on?.('chainChanged', handleChainChanged);
    eth.on?.('accountsChanged', handleAccountsChanged);

    return () => {
      eth.removeListener?.('chainChanged', handleChainChanged);
      eth.removeListener?.('accountsChanged', handleAccountsChanged);
    };
  }, []);

  return { ethereum, accounts, chainId, isReady };
}
