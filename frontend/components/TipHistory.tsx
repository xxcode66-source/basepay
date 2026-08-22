'use client';

import { useEffect, useRef, useState } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { formatUnits, keccak256, toHex, type Address } from 'viem';
import { TIP_ROUTER_ABI, TIP_ROUTER_ADDRESS, USDC_DECIMALS } from '@/lib/contracts';
import { DisplayName } from '@/lib/basename';

/* ── Types ───────────────────────────────────────────────── */
interface TipEvent {
  id: string;
  sender: Address;
  totalAmount: bigint;
  feeAmount: bigint;
  streamerAmount: bigint;
  blockNumber: bigint;
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
    const raw = localStorage.getItem(`basepay:messages:${recipient.toLowerCase()}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/* ── Compute the TipSent event topic hash ────────────────── */
const TIP_SENT_TOPIC = keccak256(toHex('TipSent(address,address,uint256,uint256,uint256)'));

/* ── Component ───────────────────────────────────────────── */
export default function TipHistory({ recipient, limit = 20, onLoaded }: TipHistoryProps) {
  const [events, setEvents] = useState<TipEvent[]>([]);
  const [historicalLoaded, setHistoricalLoaded] = useState(false);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  // Fetch historical events on mount using JSON-RPC eth_getLogs
  useEffect(() => {
    async function fetchHistorical() {
      try {
        const rpcUrl = 'https://mainnet.base.org';

        // Get current block number
        const blockRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        });
        const blockData = await blockRes.json();
        const latestBlock = parseInt(blockData.result, 16);

        // Query last ~200000 blocks (~6 days on Base)
        const fromBlock = Math.max(0, latestBlock - 200000);

        // Pad recipient address to 32 bytes for indexed topic filter
        const paddedRecipient = '0x' + recipient.slice(2).toLowerCase().padStart(64, '0');

        const logsRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getLogs',
            params: [{
              address: TIP_ROUTER_ADDRESS,
              fromBlock: '0x' + fromBlock.toString(16),
              toBlock: 'latest',
              topics: [
                TIP_SENT_TOPIC,
                null,              // sender (indexed, filtered client-side)
                paddedRecipient,   // streamer (indexed)
              ],
            }],
            id: 2,
          }),
        });
        const logsData = await logsRes.json();

        if (logsData.result && Array.isArray(logsData.result)) {
          const parsed: TipEvent[] = logsData.result.map((log: any) => {
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
            };
          });
          setEvents(
            parsed
              .sort((a, b) => Number(b.blockNumber - a.blockNumber))
              .slice(0, limit)
          );
          onLoadedRef.current?.(parsed);
        }
      } catch {
        // Silent fail — history is best-effort
      }
      setHistoricalLoaded(true);
    }

    fetchHistorical();
  }, [recipient, limit]);

  // Watch for real-time events
  useWatchContractEvent({
    address: TIP_ROUTER_ADDRESS,
    abi: TIP_ROUTER_ABI,
    eventName: 'TipSent',
    onLogs(newLogs: any[]) {
      const incoming = newLogs
        .filter((log: any) => log.args.streamer?.toLowerCase() === recipient.toLowerCase())
        .map((log: any) => ({
          id: `${log.transactionHash}-${log.logIndex}`,
          sender: log.args.sender as Address,
          totalAmount: log.args.totalAmount as bigint,
          feeAmount: log.args.feeAmount as bigint,
          streamerAmount: log.args.streamerAmount as bigint,
          blockNumber: log.blockNumber,
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

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-neutral-500 text-sm">No tips yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((tip) => {
        const msg = storedMessages.find(
          (m) => m.txHash?.toLowerCase() === tip.id.split('-')[0].toLowerCase()
        );
        return (
          <div
            key={tip.id}
            className="glass-card rounded-xl p-4 space-y-1.5 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-[10px] text-blue-400 font-bold">
                  {tip.sender.slice(2, 4).toUpperCase()}
                </div>
                <DisplayName address={tip.sender} />
              </div>
              <span className="text-sm font-semibold text-emerald-400">
                ${formatUnits(tip.streamerAmount, USDC_DECIMALS)}
              </span>
            </div>
            {msg?.message && (
              <p className="text-xs text-neutral-400 italic pl-8">
                &ldquo;{msg.message}&rdquo;
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
