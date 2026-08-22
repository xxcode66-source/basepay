'use client';

import { useEffect, useState } from 'react';
import { IconCheck, IconCopy, IconShare } from '@/lib/ui-icons';

/* ── Icons ───────────────────────────────────────────────── */
function IconTwitter() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface ShareButtonsProps {
  url: string;
  address: string;
}

export default function ShareButtons({ url, address }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const tweetText = encodeURIComponent(
    `Send me a tip on BasePay! Scan my QR code or click the link below.\n\n${url}`
  );
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BasePay Tip Jar',
          text: `Send a tip to ${shortAddr}`,
          url,
        });
      } catch {
        // User cancelled
      }
    }
  };

  // Check native share support after hydration
  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Twitter / X */}
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-400 hover:text-neutral-200 text-xs transition-all"
        title="Share on X / Twitter"
      >
        <IconTwitter />
        <span className="hidden sm:inline">Post</span>
      </a>

      {/* Native share (mobile) */}
      {canNativeShare && (
        <button
          onClick={handleNativeShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-400 hover:text-neutral-200 text-xs transition-all"
          title="Share"
        >
          <IconShare />
          <span className="hidden sm:inline">Share</span>
        </button>
      )}

      {/* Copy link */}
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all border ${
          copied
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-neutral-800/50 hover:bg-neutral-800 border-neutral-700/50 text-neutral-400 hover:text-neutral-200'
        }`}
        title="Copy link"
      >
        {copied ? <IconCheck /> : <IconCopy />}
        <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy link'}</span>
      </button>
    </div>
  );
}
