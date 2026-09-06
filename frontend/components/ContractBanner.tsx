'use client';

import { getChainConfig } from '@/lib/contracts';
import { getExplorerUrl, BASE_CHAIN_ID, ROBINHOOD_CHAIN_ID } from '@/lib/chains';

const ZERO = '0x0000000000000000000000000000000000000000';

function isValid(addr: string | undefined): addr is `0x${string}` {
  return !!addr && addr !== ZERO;
}

function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function ContractLink({ address, explorerUrl }: { address: string; explorerUrl: string }) {
  return (
    <a
      href={`${explorerUrl}/address/${address}#code`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-emerald-500 hover:text-emerald-400 transition-colors font-mono"
    >
      {address.slice(0, 6)}...{address.slice(-4)}
    </a>
  );
}

export default function ContractBanner() {
  const baseCfg = getChainConfig(BASE_CHAIN_ID);
  const rhCfg = getChainConfig(ROBINHOOD_CHAIN_ID);
  const baseExplorer = getExplorerUrl(BASE_CHAIN_ID);
  const rhExplorer = getExplorerUrl(ROBINHOOD_CHAIN_ID);

  const baseUsdcValid = isValid(baseCfg.tipRouterAddress);
  const baseUsdtValid = isValid(baseCfg.tipRouterUsdtAddress);
  const rhValid = isValid(rhCfg.tipRouterAddress);

  if (!baseUsdcValid && !baseUsdtValid && !rhValid) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 py-2 px-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
      {/* ── Base ─────────────────────────────────────────── */}
      {baseUsdcValid && (
        <div className="flex items-center justify-center gap-2">
          <ShieldIcon />
          <span className="text-[10px] text-neutral-400">
            <span className="text-neutral-500 font-medium">Base</span>{' '}
            USDC verified:{' '}
            <ContractLink address={baseCfg.tipRouterAddress} explorerUrl={baseExplorer} />
          </span>
        </div>
      )}
      {baseUsdtValid && (
        <div className="flex items-center justify-center gap-2">
          <ShieldIcon />
          <span className="text-[10px] text-neutral-400">
            <span className="text-neutral-500 font-medium">Base</span>{' '}
            USDT verified:{' '}
            <ContractLink address={baseCfg.tipRouterUsdtAddress} explorerUrl={baseExplorer} />
          </span>
        </div>
      )}

      {/* ── Robinhood Chain ──────────────────────────────── */}
      {rhValid && (
        <div className="flex items-center justify-center gap-2">
          <ShieldIcon />
          <span className="text-[10px] text-neutral-400">
            <span className="text-neutral-500 font-medium">Robinhood</span>{' '}
            USDG verified:{' '}
            <ContractLink address={rhCfg.tipRouterAddress} explorerUrl={rhExplorer} />
          </span>
        </div>
      )}
    </div>
  );
}
