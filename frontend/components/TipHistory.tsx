'use client';

import { useEffect, useRef, useState } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { formatUnits, keccak256, toHex, type Address } from 'viem';
import { TIP_ROUTER_ABI, TIP_ROUTER_ADDRESS, USDC_DECIMALS, TIP_ROUTER_USDT_ADDRESS, TIP_ROUTER_USDT_ABI, USDT_DECIMALS, BASE_RPC_URL } from '@/lib/contracts';
import { DisplayName } from '@/lib/basename';

/* ── Types ───────────────────────────────────────────────── */
interface TipEvent {
  id: string;
  sender: Address;
  totalAmount: bigint;
  feeAmount: bigint;
  streamerAmount: bigint;
  blockNumber: bigint;
  token: 'USDC' | 'USDT';
}

interface TipHistoryProps {
  recipient: Address;
  limit?: number;
  onLoaded?: (events: TipEvent[]) => void;
}

/* ── localStorage messages (stored by sender, read by recipient) ── */
interface StoredMessage {
  txHash: string;
  sender: string;
  message: string;
  timestamp: number;
}

function getMessagesForRecipient(recipient: Address): StoredMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`basetip:messages:${recipient.toLowerCase()}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/* ── RPC Log Types ───────────────────────────────────────── */
interface RpcLog {
  transactionHash: string;
  logIndex: string;
  topics: string[];
  data: string;
  blockNumber: string;
}

/* ── Compute the TipSent event topic hash ────────────────── */
const TIP_SENT_TOPIC = keccak256(toHex('TipSent(address,address,uint256,uint256,uint256)'));
const MAX_LOG_BLOCK_RANGE = 10_000;
const HISTORY_BLOCKS = 200_000;

/* ── Component ───────────────────────────────────────────── */
export default function TipHistory({ recipient, limit = 20, onLoaded }: TipHistoryProps) {
  const [events, setEvents] = useState<TipEvent[]>([]);
  const [historicalLoaded, setHistoricalLoaded] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  // Fetch historical events on mount using JSON-RPC eth_getLogs
  useEffect(() => {
    async function fetchHistorical() {
      try {
        const rpcUrl = BASE_RPC_URL;

        // Get current block number
        const blockRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        });
        const blockData = await blockRes.json();
        const latestBlock = parseInt(blockData.result, 16);

        // Query last ~200000 blocks (~6 days on Base)
        const fromBlock = Math.max(0, latestBlock - HISTORY_BLOCKS);

        // Pad recipient address to 32 bytes for indexed topic filter
        const paddedRecipient = '0x' + recipient.slice(2).toLowerCase().padStart(64, '0');

        // Fetch from both USDC and USDT routers
        const routers = [
          { address: TIP_ROUTER_ADDRESS, token: 'USDC' as const },
          { address: TIP_ROUTER_USDT_ADDRESS, token: 'USDT' as const },
        ];

        const allLogs: (RpcLog & { token: 'USDC' | 'USDT' })[] = [];

        for (const router of routers) {
          // Skip if router address is not set
          if (!router.address || router.address === '0x0000000000000000000000000000000000000000') continue;

          for (let batchFrom = fromBlock; batchFrom <= latestBlock; batchFrom += MAX_LOG_BLOCK_RANGE + 1) {
            const batchTo = Math.min(batchFrom + MAX_LOG_BLOCK_RANGE, latestBlock);
            const logsRes = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getLogs',
                params: [{
                  address: router.address,
                  fromBlock: '0x' + batchFrom.toString(16),
                  toBlock: '0x' + batchTo.toString(16),
                  topics: [TIP_SENT_TOPIC, null, paddedRecipient],
                }],
                id: 2,
              }),
            });
            const logsData = await logsRes.json();
            if (logsData.error) throw new Error(logsData.error.message);
            if (Array.isArray(logsData.result)) {
              allLogs.push(...logsData.result.map((log: RpcLog) => ({ ...log, token: router.token })));
            }
          }
        }

        if (allLogs.length > 0) {
          const parsed: TipEvent[] = allLogs.map((log: RpcLog & { token: 'USDC' | 'USDT' }) => {
            // data is a single hex string: 3 × 32-byte words (totalAmount, feeAmount, streamerAmount)
            const data = log.data.startsWith('0x') ? log.data.slice(2) : log.data;
            return {
              id: `${log.transactionHash}-${log.logIndex}`,
              // topics[1] is indexed sender address (32 bytes, take last 20)
              sender: ('0x' + log.topics[1].slice(26)) as Address,
              totalAmount: BigInt('0x' + data.slice(0, 64)),
              feeAmount: BigInt('0x' + data.slice(64, 128)),
              streamerAmount: BigInt('0x' + data.slice(128, 192)),
              blockNumber: BigInt(log.blockNumber),
              token: log.token,
            };
          });
          setEvents(
            parsed
              .sort((a, b) => Number(b.blockNumber - a.blockNumber))
              .slice(0, limit)
          );
          onLoadedRef.current?.(parsed);
        }
      } catch (error) {
        console.error('[BaseTip history] Failed to load tip history:', error);
        setFetchError('Failed to load tip history. Please try again later.');
      }
      setHistoricalLoaded(true);
    }

    fetchHistorical();
  }, [recipient, limit]);

  // Watch for real-time events from USDC router
  useWatchContractEvent({
    address: TIP_ROUTER_ADDRESS,
    abi: TIP_ROUTER_ABI,
    eventName: 'TipSent',
    onLogs(newLogs: any[]) {
      const incoming = newLogs
        .filter((log: any) => log.args.streamer?.toLowerCase() === recipient.toLowerCase())
        .map((log: any) => ({
          id: `${log.transactionHash}-${log.logIndex}`,
          sender: (log.args.sender ?? '0x0') as Address,
          totalAmount: (log.args.totalAmount ?? 0n) as bigint,
          feeAmount: (log.args.feeAmount ?? 0n) as bigint,
          streamerAmount: (log.args.streamerAmount ?? 0n) as bigint,
          blockNumber: BigInt(log.blockNumber),
          token: 'USDC' as const,
        }));

      if (incoming.length > 0) {
        setEvents((prev) => {
          const existingIds = new Set(prev.map((e: TipEvent) => e.id));
          const newEvents = incoming.filter((e: TipEvent) => !existingIds.has(e.id));
          return [...newEvents, ...prev].slice(0, limit);
        });
      }
    },
  });

  // Watch for real-time events from USDT router
  useWatchContractEvent({
    address: TIP_ROUTER_USDT_ADDRESS,
    abi: TIP_ROUTER_USDT_ABI,
    eventName: 'TipSent',
    onLogs(newLogs: any[]) {
      const incoming = newLogs
        .filter((log: any) => log.args.streamer?.toLowerCase() === recipient.toLowerCase())
        .map((log: any) => ({
          id: `${log.transactionHash}-${log.logIndex}`,
          sender: (log.args.sender ?? '0x0') as Address,
          totalAmount: (log.args.totalAmount ?? 0n) as bigint,
          feeAmount: (log.args.feeAmount ?? 0n) as bigint,
          streamerAmount: (log.args.streamerAmount ?? 0n) as bigint,
          blockNumber: BigInt(log.blockNumber),
          token: 'USDT' as const,
        }));

      if (incoming.length > 0) {
        setEvents((prev) => {
          const existingIds = new Set(prev.map((e: TipEvent) => e.id));
          const newEvents = incoming.filter((e: TipEvent) => !existingIds.has(e.id));
          return [...newEvents, ...prev].slice(0, limit);
        });
      }
    },
  });

  const storedMessages = getMessagesForRecipient(recipient);

  if (!historicalLoaded) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
            <div className="skeleton h-4 w-32 rounded mb-2" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="text-center py-6">
        <p className="text-neutral-500 text-xs">{fetchError}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-neutral-500 text-sm">No tips yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((tip, index) => {
        const msg = storedMessages.find(
          (m) => m.txHash?.toLowerCase() === tip.id.split('-')[0].toLowerCase()
        );
        return (
          <div
            key={tip.id}
            className="glass-card glass-card-glow rounded-xl p-4 space-y-1.5 animate-tip-slide-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-[10px] text-blue-400 font-bold">
                  {tip.sender.slice(2, 4).toUpperCase()}
                </div>
                <DisplayName address={tip.sender} />
              </div>
              <span className="text-sm font-semibold text-emerald-400">
                ${formatUnits(tip.streamerAmount, tip.token === 'USDT' ? USDT_DECIMALS : USDC_DECIMALS)}
                <span className="text-[10px] text-neutral-500 ml-1">{tip.token}</span>
              </span>
            </div>
            {msg?.message && (
              <p className="text-xs text-neutral-400 italic pl-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                &ldquo;{msg.message}&rdquo;
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
