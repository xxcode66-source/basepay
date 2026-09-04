'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { isAddress, type Address } from 'viem';
import { DisplayName } from '@/lib/basename';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/* ── localStorage helpers ────────────────────────────────── */
function getGoal(addr: string): number {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem(`basepay:goal:${addr.toLowerCase()}`) || '0');
}
function setGoal(addr: string, amount: number) {
  localStorage.setItem(`basepay:goal:${addr.toLowerCase()}`, String(amount));
}

export default function GoalPage() {
  const params = useParams<{ address: string }>();
  const address = params.address as Address;
  const valid = isAddress(address);

  const [goal, setGoalState] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!valid) return;
    const current = getGoal(address);
    if (current > 0) setGoalState(String(current));
  }, [address, valid]);

  const handleSave = () => {
    const amount = parseFloat(goal);
    if (isNaN(amount) || amount <= 0) return;
    setGoal(address, amount);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setGoal(address, 0);
    setGoalState('');
    setSaved(false);
  };

  if (!valid) {
    return (
      <main className="min-h-screen bg-ambient flex items-center justify-center px-6 text-center">
        <div className="glass-card rounded-2xl p-8 max-w-sm">
          <h2 className="text-lg font-semibold mb-2">Invalid address</h2>
          <p className="text-sm text-neutral-400">The address in this link is not recognized.</p>
        </div>
      </main>
    );
  }

  const tipUrl = `${APP_URL}/tip/${address}`;

  return (
    <div className="bg-ambient">
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-6 animate-fade-in-up">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Set Your Tip Goal</h1>
            <p className="text-sm text-neutral-400">
              Set a funding goal for <DisplayName address={address} />
            </p>
          </div>

          {/* Goal Input Card */}
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-2 block">
                Goal amount (USD)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 text-2xl font-bold">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={goal}
                  onChange={(e) => setGoalState(e.target.value)}
                  placeholder="500"
                  className="input-base flex-1 rounded-xl px-4 py-3 text-lg font-bold"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={!goal || parseFloat(goal) <= 0}
                className="btn-primary flex-1 rounded-xl py-3 text-sm font-medium"
              >
                {saved ? 'Saved!' : 'Save Goal'}
              </button>
              {getGoal(address) > 0 && (
                <button
                  onClick={handleClear}
                  className="px-4 py-3 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-400 text-sm transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Overlay Link */}
          <div className="glass-card rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-semibold">OBS Overlay URL</h3>
            <p className="text-xs text-neutral-500">
              Add this as a Browser Source in OBS to show real-time tip alerts on your stream.
            </p>
            <code className="block text-xs font-mono text-blue-400 bg-neutral-800/50 rounded-lg px-3 py-2 break-all">
              {APP_URL}/overlay/{address}
            </code>
          </div>

          {/* Tip Link */}
          <div className="glass-card rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-semibold">Your Tip Jar Link</h3>
            <code className="block text-xs font-mono text-neutral-400 bg-neutral-800/50 rounded-lg px-3 py-2 break-all">
              {tipUrl}
            </code>
          </div>
        </div>
      </main>
    </div>
  );
}
