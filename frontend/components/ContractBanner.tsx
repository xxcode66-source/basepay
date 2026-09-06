'use client';

import { useChainId } from 'wagmi';
import { getChainConfig } from '@/lib/contracts';
import { getExplorerUrl, getExplorerName } from '@/lib/chains';

export default function ContractBanner() {
  const chainId = useChainId();
  const cc = getChainConfig(chainId);
  const explorerUrl = getExplorerUrl(chainId);
  const explorerName = getExplorerName(chainId);

  const usdcValid = cc.tipRouterAddress && cc.tipRouterAddress !== '0x0000000000000000000000000000000000000000';
  const usdtValid = cc.tipRouterUsdtAddress && cc.tipRouterUsdtAddress !== '0x0000000000000000000000000000000000000000';

  if (!usdcValid && !usdtValid) {
    return null;
  }

  // Determine label based on chain
  const tokenLabel = cc.usdcAddress !== '0x0000000000000000000000000000000000000000' ? 'USDC' : 'USDG';

  return (
    <div className="flex flex-col gap-1.5 py-2 px-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
      {usdcValid && (
        <div className="flex items-center justify-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <span className="text-[10px] text-neutral-400">
            {tokenLabel} verified:{' '}
            <a
              href={`${explorerUrl}/address/${cc.tipRouterAddress}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-400 transition-colors font-mono"
            >
              {cc.tipRouterAddress.slice(0, 6)}...{cc.tipRouterAddress.slice(-4)}
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
              href={`${explorerUrl}/address/${cc.tipRouterUsdtAddress}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-400 transition-colors font-mono"
            >
              {cc.tipRouterUsdtAddress.slice(0, 6)}...{cc.tipRouterUsdtAddress.slice(-4)}
            </a>
          </span>
        </div>
      )}
    </div>
  );
}
