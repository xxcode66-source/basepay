'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useWatchContractEvent } from 'wagmi';
import { formatUnits, type Address } from 'viem';
import { TIP_ROUTER_ABI, TIP_ROUTER_ADDRESS, USDC_DECIMALS } from '@/lib/contracts';
import { useBasename } from '@/lib/basename';

interface TipAlert {
  id: string;
  sender: Address;
  amount: string;
}

const DISPLAY_DURATION_MS = 7000;
const EXIT_ANIMATION_MS = 500;

export default function OverlayPage() {
  const params = useParams<{ address: string }>();
  const recipientAddress = params.address as Address;

  const [queue, setQueue] = useState<TipAlert[]>([]);
  const [current, setCurrent] = useState<TipAlert | null>(null);
  const [visible, setVisible] = useState(false);
  const { name: senderName } = useBasename(current?.sender ?? undefined);
  const audioRef = useRef<HTMLAudioElement>(null);

  useWatchContractEvent({
    address: TIP_ROUTER_ADDRESS,
    abi: TIP_ROUTER_ABI,
    eventName: 'TipSent',
    pollingInterval: 3_000,
    onLogs(logs) {
      const incoming = logs
        .filter((log) => log.args.streamer?.toLowerCase() === recipientAddress.toLowerCase())
        .map((log) => {
          const { sender, streamerAmount } = log.args as {
            sender: Address;
            streamerAmount: bigint;
          };
          return {
            id: `${log.transactionHash}-${log.logIndex}`,
            sender,
            amount: formatUnits(streamerAmount, USDC_DECIMALS),
          };
        });
      if (incoming.length > 0) {
        setQueue((prev) => [...prev, ...incoming]);
      }
    },
  });

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
          className={`transition-all duration-500 ease-out ${
            visible
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-6 scale-95'
          }`}
        >
          <div className="bg-neutral-900/95 border-2 border-blue-500 rounded-2xl px-8 py-5 shadow-2xl shadow-blue-500/40 flex items-center gap-4">
            <div className="text-4xl">🎉</div>
            <div>
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
