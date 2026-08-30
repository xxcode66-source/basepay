'use client';

import { TIP_ROUTER_ADDRESS, TIP_ROUTER_USDT_ADDRESS } from '@/lib/contracts';

const BASESCAN_URL = 'https://basescan.org';

export default function ContractBanner() {
  const usdcValid = TIP_ROUTER_ADDRESS && TIP_ROUTER_ADDRESS !== '0x0000000000000000000000000000000000000000';
  const usdtValid = TIP_ROUTER_USDT_ADDRESS && TIP_ROUTER_USDT_ADDRESS !== '0x0000000000000000000000000000000000000000';

  if (!usdcValid && !usdtValid) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 py-2 px-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
      {usdcValid && (
        <div className="flex items-center justify-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <span className="text-[10px] text-neutral-400">
            USDC verified:{' '}
            <a
              href={`${BASESCAN_URL}/address/${TIP_ROUTER_ADDRESS}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-400 transition-colors font-mono"
            >
              {TIP_ROUTER_ADDRESS.slice(0, 6)}...{TIP_ROUTER_ADDRESS.slice(-4)}
            </a>
          </span>
        </div>
      )}
      {usdtValid && (
        <div className="flex items-center justify-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <span className="text-[10px] text-neutral-400">
            USDT verified:{' '}
            <a
              href={`${BASESCAN_URL}/address/${TIP_ROUTER_USDT_ADDRESS}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-400 transition-colors font-mono"
            >
              {TIP_ROUTER_USDT_ADDRESS.slice(0, 6)}...{TIP_ROUTER_USDT_ADDRESS.slice(-4)}
            </a>
          </span>
        </div>
      )}
    </div>
  );
}
