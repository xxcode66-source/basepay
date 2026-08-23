'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatUnits, isAddress, keccak256, toHex, type Address } from 'viem';
import { TIP_ROUTER_ADDRESS, USDC_DECIMALS } from '@/lib/contracts';
import { useBasename } from '@/lib/basename';

interface TipAlert {
  id: string;
  sender: Address;
  amount: string;
}

const DISPLAY_DURATION_MS = 7000;
const EXIT_ANIMATION_MS = 500;
const BASE_MAINNET_CHAIN_ID = 8453;
const INITIAL_LOOKBACK_BLOCKS = 20n;
const BASE_RPC_URL = 'https://mainnet.base.org';
const TIP_SENT_TOPIC = keccak256(toHex('TipSent(address,address,uint256,uint256,uint256)'));

export default function OverlayPage() {
  const params = useParams<{ address: string }>();
  const recipientAddress = params.address as Address;

  const [queue, setQueue] = useState<TipAlert[]>([]);
  const [current, setCurrent] = useState<TipAlert | null>(null);
  const [visible, setVisible] = useState(false);
  const { name: senderName } = useBasename(current?.sender ?? undefined);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastBlockRef = useRef<bigint | null>(null);
  const seenLogsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!isAddress(recipientAddress)) return;
    let stopped = false;
    let polling = false;

    const pollLogs = async () => {
      if (stopped || polling) return;
      polling = true;
      try {
        const blockResponse = await fetch(BASE_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
        });
        const blockData = await blockResponse.json();
        const latestBlock = BigInt(blockData.result);
        if (lastBlockRef.current === null) {
          lastBlockRef.current = latestBlock > INITIAL_LOOKBACK_BLOCKS
            ? latestBlock - INITIAL_LOOKBACK_BLOCKS
            : 0n;
        }
        if (latestBlock <= lastBlockRef.current) return;

        const paddedRecipient = `0x${recipientAddress.slice(2).toLowerCase().padStart(64, '0')}`;
        const logsResponse = await fetch(BASE_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'eth_getLogs',
            params: [{
              address: TIP_ROUTER_ADDRESS,
              fromBlock: `0x${(lastBlockRef.current + 1n).toString(16)}`,
              toBlock: `0x${latestBlock.toString(16)}`,
              topics: [TIP_SENT_TOPIC, null, paddedRecipient],
            }],
          }),
        });
        const logsData = await logsResponse.json();
        if (logsData.error) throw new Error(logsData.error.message);
        lastBlockRef.current = latestBlock;

        const incoming: TipAlert[] = (logsData.result ?? []).flatMap((log: { transactionHash: string; logIndex: string; topics: string[]; data: string }) => {
          const id = `${log.transactionHash}-${log.logIndex}`;
          if (seenLogsRef.current.has(id)) return [];
          seenLogsRef.current.add(id);
          const data = log.data.slice(2);
          const sender = `0x${log.topics[1].slice(-40)}` as Address;
          const streamerAmount = BigInt(`0x${data.slice(128, 192)}`);
          return [{ id, sender, amount: formatUnits(streamerAmount, USDC_DECIMALS) }];
        });
        if (incoming.length > 0) setQueue((prev) => [...prev, ...incoming]);
      } catch (error) {
        console.error('[BasePay overlay] Failed to poll tip logs:', error);
      } finally {
        polling = false;
      }
    };

    pollLogs();
    const interval = window.setInterval(pollLogs, 3_000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [recipientAddress]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
  }, [queue, current]);

  useEffect(() => {
    if (!current) return;

    setVisible(true);
    audioRef.current?.play().catch(() => {});

    const hideTimer = setTimeout(
      () => setVisible(false),
      DISPLAY_DURATION_MS - EXIT_ANIMATION_MS
    );
    const clearTimer = setTimeout(() => setCurrent(null), DISPLAY_DURATION_MS);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(clearTimer);
    };
  }, [current]);

  return (
    <div className="min-h-screen w-screen flex items-end justify-center bg-transparent pb-16 overflow-hidden">
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />

      {current && (
        <div
          className={`relative transition-all duration-500 ease-out ${
            visible
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-6 scale-95'
          }`}
        >
          {/* Glow effect behind card */}
          <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl animate-pulse-ring" />
          
          <div className="relative bg-neutral-900/95 border-2 border-blue-500 rounded-2xl px-8 py-5 shadow-2xl shadow-blue-500/40 flex items-center gap-4">
            {/* Animated gradient border overlay */}
            <div className="absolute inset-0 rounded-2xl opacity-30 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 bg-[length:200%_100%] animate-[btn-shimmer_3s_linear_infinite] mix-blend-overlay" />
            
            <div className="relative text-4xl animate-success-bounce">🎉</div>
            <div className="relative">
              <p className="text-blue-400 font-bold text-lg leading-tight">
                New Tip: ${current.amount} USDC!
              </p>
              <p className="text-neutral-400 text-sm font-mono">
                {senderName || `${current.sender.slice(0, 6)}...${current.sender.slice(-4)}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
