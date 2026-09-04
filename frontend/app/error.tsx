'use client';

import { useEffect } from 'react';
import { IconAlert } from '@/lib/ui-icons';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('BaseTip error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-ambient flex items-center justify-center px-6">
      <div className="glass-card rounded-2xl p-8 max-w-sm text-center space-y-4 animate-scale-in">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-400">
          <IconAlert size={24} />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-1">Something went wrong</h2>
          <p className="text-sm text-neutral-400">
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <button
          onClick={reset}
          className="btn-primary w-full rounded-xl py-3 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
