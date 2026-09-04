'use client';

import { useState, useEffect } from 'react';
import { type Address, createPublicClient, http } from 'viem';
import { base } from 'wagmi/chains';

/* ── Basenames registry contract address (Base mainnet) ──── */
const BASENAMES_REGISTRY = '0x1836e35704143e76263B440135f0aB74E117c5f2' as const;

const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

/* ── Cache ───────────────────────────────────────────────── */
const cache = new Map<string, string | null>();

/* ── Resolve Basename (address → name) ───────────────────── */
async function resolveBasename(address: Address): Promise<string | null> {
  const key = address.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  try {
    // Step 1: Get the resolver for this address via the registry
    const resolver = await baseClient.readContract({
      address: BASENAMES_REGISTRY,
      abi: [
        {
          name: 'resolver',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'addr', type: 'address' }],
          outputs: [{ name: '', type: 'address' }],
        },
      ],
      functionName: 'resolver',
      args: [address],
    });

    if (!resolver || resolver === '0x0000000000000000000000000000000000000000') {
      cache.set(key, null);
      return null;
    }

    // Step 2: Call name(address) on the resolver for reverse resolution
    const name = await baseClient.readContract({
      address: resolver as Address,
      abi: [
        {
          name: 'name',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'addr', type: 'address' }],
          outputs: [{ name: '', type: 'string' }],
        },
      ],
      functionName: 'name',
      args: [address],
    });

    const result = (name as string) || null;
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}

/* ── Hook: useBasename ───────────────────────────────────── */
export function useBasename(address: Address | undefined) {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;

    const key = address.toLowerCase();
    if (cache.has(key)) {
      setName(cache.get(key)!);
      return;
    }

    let cancelled = false;
    setLoading(true);

    resolveBasename(address).then((resolved) => {
      if (!cancelled) {
        setName(resolved);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { name, loading };
}

/* ── Display Component ───────────────────────────────────── */
export function DisplayName({ address }: { address: Address }) {
  const { name, loading } = useBasename(address);

  if (loading) {
    return <span className="skeleton inline-block w-20 h-4 rounded" />;
  }

  if (name) {
    return (
      <span className="text-blue-400 font-medium" title={address}>
        {name}
      </span>
    );
  }

  return (
    <span className="font-mono text-neutral-200" title={address}>
      {address.slice(0, 6)}...{address.slice(-4)}
    </span>
  );
}
