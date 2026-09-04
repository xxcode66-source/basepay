'use client';

import { useEffect, useState } from 'react';
import { IconCheck, IconCopy, IconShare } from '@/lib/ui-icons';
import { isNimiqPay } from '@/lib/nimiq';

/* ── Icons ───────────────────────────────────────────────── */
function IconTwitter() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconNimiq() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
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
  const [inNimiqPay, setInNimiqPay] = useState(false);
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const tweetText = encodeURIComponent(
    `Send me a tip on BasePay! Scan my QR code or click the link below.\n\n${url}`
  );
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  // Nimiq deeplink
  const nimiqDeeplink = `nimiqpay://miniapp?url=${encodeURIComponent(url)}`;

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

  const handleNimiqShare = () => {
    window.location.href = nimiqDeeplink;
  };

  // Check native share support and Nimiq Pay environment after hydration
  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    setInNimiqPay(isNimiqPay());
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Nimiq Pay */}
      {inNimiqPay && (
        <button
          onClick={handleNimiqShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-400 hover:text-neutral-200 text-xs transition-all"
          title="Share via Nimiq Pay"
        >
          <IconNimiq />
          <span className="hidden sm:inline">Nimiq</span>
        </button>
      )}

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
