'use client';

import { useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { isAddress } from 'viem';
import { IconCheck, IconCopy, IconDownload, IconArrowRight } from '@/lib/ui-icons';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/* ── Icons (inline SVG, zero deps) ───────────────────────── */
function IconQr() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="8" height="8" rx="1" />
      <rect x="14" y="2" width="8" height="8" rx="1" />
      <rect x="2" y="14" width="8" height="8" rx="1" />
      <rect x="14" y="14" width="4" height="4" rx="0.5" />
      <rect x="20" y="14" width="2" height="2" rx="0.25" />
      <rect x="14" y="20" width="2" height="2" rx="0.25" />
      <rect x="20" y="20" width="2" height="2" rx="0.25" />
    </svg>
  );
}

/* ── Steps data ──────────────────────────────────────────── */
const STEPS = [
  {
    num: '01',
    title: 'Enter your address',
    desc: 'Paste your Base wallet address to generate a unique tip link.',
  },
  {
    num: '02',
    title: 'Get your QR code',
    desc: 'A scannable QR code and shareable link are generated instantly.',
  },
  {
    num: '03',
    title: 'Share it anywhere',
    desc: 'Add it to your stream overlay, website, bio, or send it directly.',
  },
];

export default function GeneratorPage() {
  const [address, setAddress] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const isValid = useMemo(() => isAddress(address), [address]);
  const tipUrl = `${APP_URL}/tip/${address}`;

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `basepay-qr-${address.slice(2, 8)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(tipUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-ambient">
      <main className="min-h-screen flex flex-col">
        {/* ── Nav ──────────────────────────────────────────── */}
        <nav className="w-full px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">BasePay</span>
          </div>
          <a
            href="https://base.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Built on Base
          </a>
        </nav>

        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="flex-1 flex flex-col items-center px-6 pt-12 pb-20">
          <div className="text-center max-w-lg mx-auto mb-12 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              USDC on Base Network
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gradient leading-tight mb-4">
              The fastest way to<br />
              <span className="text-gradient-blue">send a tip.</span>
            </h1>
            <p className="text-neutral-400 text-base leading-relaxed max-w-md mx-auto">
              Generate a personal tip jar link. Anyone can send you USDC instantly
              — just one scan, one tap, done.
            </p>
          </div>

          {/* ── Generator Card ─────────────────────────────── */}
          <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            {!submitted ? (
              <div className="glass-card rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <IconQr />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Generate Your Tip Jar</h2>
                    <p className="text-xs text-neutral-500">One link. Works forever.</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-400 mb-2 block">
                    Wallet address (Base)
                  </label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value.trim())}
                    placeholder="0x..."
                    spellCheck={false}
                    className="input-base w-full rounded-xl px-4 py-3.5 text-sm font-mono"
                  />
                  {address.length > 0 && !isValid && (
                    <p className="text-red-400/80 text-xs mt-2 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-red-400" />
                      Invalid address format
                    </p>
                  )}
                </div>

                <button
                  disabled={!isValid}
                  onClick={() => setSubmitted(true)}
                  className="btn-primary w-full rounded-xl py-3.5 font-medium text-sm flex items-center justify-center gap-2"
                >
                  Generate Tip Jar
                  <IconArrowRight />
                </button>
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-6 flex flex-col items-center space-y-5 animate-scale-in">
                {/* QR Display */}
                <div className="flex items-center gap-3 self-start">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <IconCheck />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Your tip jar is ready!</h2>
                    <p className="text-xs text-neutral-500">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                  </div>
                </div>

                <div
                  ref={qrRef}
                  className="bg-white p-4 rounded-xl shadow-lg shadow-black/20"
                >
                  <QRCodeCanvas value={tipUrl} size={200} level="H" />
                </div>

                {/* URL with copy */}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800/50 hover:bg-neutral-800 px-3 py-2 rounded-lg transition-all max-w-full"
                >
                  {copied ? (
                    <>
                      <IconCheck />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <IconCopy />
                      <span className="truncate font-mono">{tipUrl}</span>
                    </>
                  )}
                </button>

                {/* Actions */}
                <div className="flex gap-3 w-full">
                  <button
                    onClick={handleDownload}
                    className="btn-primary flex-1 rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <IconDownload />
                    Download PNG
                  </button>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setAddress('');
                    }}
                    className="flex-1 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300 transition-colors rounded-xl py-3 text-sm font-medium"
                  >
                    Change address
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── How it works ───────────────────────────────── */}
          <div
            className="w-full max-w-2xl mt-20 animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            <h3 className="text-center text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-8">
              How it works
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
              {STEPS.map((s) => (
                <div
                  key={s.num}
                  className="glass-card rounded-xl p-5 space-y-2"
                >
                  <span className="text-xs font-mono text-blue-400/60">{s.num}</span>
                  <h4 className="text-sm font-semibold">{s.title}</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────── */}
        <footer className="w-full px-6 py-6 border-t border-neutral-800/50">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-neutral-600">
              BasePay — Non-custodial tip jar. Send USDC to anyone, anywhere.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-neutral-600">5% platform fee</span>
              <span className="w-1 h-1 rounded-full bg-neutral-700" />
              <span className="text-xs text-neutral-600">USDC · Base</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
