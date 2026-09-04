'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { isAddress } from 'viem';
import { IconCheck, IconCopy, IconDownload, IconArrowRight } from '@/lib/ui-icons';
import { isNimiqPay } from '@/lib/nimiq';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/* ── Address Type Detection ──────────────────────────────── */
const NIM_REGEX = /^NQ\d{2}(\s?\d{4}){8}$/;
type AddressType = 'evm' | 'nim' | 'invalid';

function detectAddressType(addr: string): AddressType {
  const trimmed = addr.trim();
  if (!trimmed) return 'invalid';
  if (trimmed.startsWith('0x') && isAddress(trimmed)) return 'evm';
  if (NIM_REGEX.test(trimmed)) return 'nim';
  return 'invalid';
}

function nimToRaw(addr: string): string {
  return addr.replace(/\s/g, '');
}

function getNimiqPaymentUri(addr: string): string {
  return `nimiq:${nimToRaw(addr)}`;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

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
    desc: 'Paste your EVM (0x) or NIM (NQ) address to generate a QR code.',
  },
  {
    num: '02',
    title: 'Get your QR code',
    desc: 'EVM gets a tip page link. NIM gets a payment URI scannable by Nimiq Wallet.',
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
  const [inNimiqPay, setInNimiqPay] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Detect Nimiq Pay environment after hydration
  useEffect(() => {
    setInNimiqPay(isNimiqPay());
  }, []);

  const addressType = useMemo(() => detectAddressType(address), [address]);
  const isValid = addressType !== 'invalid';
  const isNim = addressType === 'nim';
  const qrContent = isNim ? getNimiqPaymentUri(address) : `${APP_URL}/tip/${address}`;
  const qrTokens = isNim ? ['NIM'] : ['USDC', 'USDT', 'NIM'];

  const handleDownload = async () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    // Load icon.png for use in the download
    const iconImg = new Image();
    iconImg.crossOrigin = 'anonymous';
    iconImg.src = '/icon.png';
    await new Promise<void>((resolve, reject) => {
      iconImg.onload = () => resolve();
      iconImg.onerror = () => reject(new Error('Failed to load icon.png'));
      setTimeout(() => reject(new Error('Icon load timed out')), 5000);
    });

    const scale = 3;
    const frameWidth = 300;
    const frameHeight = 380;
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = frameWidth * scale;
    frameCanvas.height = frameHeight * scale;
    const ctx = frameCanvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);

    // Background with gradient-like effect
    const gradient = ctx.createLinearGradient(0, 0, 0, frameHeight);
    gradient.addColorStop(0, '#1e40af');
    gradient.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, 0, 0, frameWidth, frameHeight, 24);

    // Header: Icon + Brand
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(14, 18, 24, 24, 6);
    ctx.clip();
    ctx.drawImage(iconImg, 14, 18, 24, 24);
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BaseTip', 46, 38);

    // QR Code white background
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, 20, 62, 260, 260, 16);
    
    // Draw QR code
    ctx.drawImage(canvas, 35, 77, 230, 230);

    // Icon in center of QR
    const logoSize = 36;
    const logoX = (frameWidth - logoSize) / 2;
    const logoY = 62 + (260 - logoSize) / 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8, 8);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(logoX, logoY, logoSize, logoSize, 6);
    ctx.clip();
    ctx.drawImage(iconImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();

    // Token badges at bottom
    const tokens = isNim ? ['NIM'] : ['USDC', 'USDT', 'NIM'];
    const badgeY = 338;
    const badgeWidth = 56;
    const badgeHeight = 22;
    const totalBadgesWidth = tokens.length * badgeWidth + (tokens.length - 1) * 8;
    let badgeX = (frameWidth - totalBadgesWidth) / 2;
    
    tokens.forEach((token) => {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 11);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(token, badgeX + badgeWidth / 2, badgeY + 15);
      badgeX += badgeWidth + 8;
    });

    // "SCAN TO TIP" text
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('SCAN TO TIP', frameWidth / 2, 372);

    const link = document.createElement('a');
    const suffix = isNim ? nimToRaw(address).slice(2, 8) : address.slice(2, 8);
    link.download = `basetip-${suffix}.png`;
    link.href = frameCanvas.toDataURL('image/png');
    link.click();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(qrContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-ambient bg-grid min-h-screen">
      {/* Floating orbs */}
      <div className="orb-container">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <main className="min-h-screen flex flex-col">
        {/* ── Nav ──────────────────────────────────────────── */}
        <nav className="w-full px-6 py-5 flex items-center justify-between max-w-5xl mx-auto animate-fade-in-down">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="BaseTip" className="w-7 h-7 rounded-lg animate-float" />
            <span className="text-sm font-semibold tracking-tight">BaseTip</span>
          </div>
          <a
            href={inNimiqPay ? "https://nimiq.com" : "https://base.org"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {inNimiqPay ? 'Nimiq Pay Mini App' : 'Built on Base'}
          </a>
        </nav>

        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="flex-1 flex flex-col items-center px-6 pt-12 pb-20">
          <div className="text-center max-w-lg mx-auto mb-12 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6 animate-fade-in-down" style={{ animationDelay: '0.1s' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {inNimiqPay ? 'Powered by Nimiq Pay & Base' : 'EVM (USDC · USDT) · NIM on Base'}
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gradient leading-tight mb-4">
              The fastest way to<br />
              <span className="text-gradient-blue">send a tip.</span>
            </h1>
            <p className="text-neutral-400 text-base leading-relaxed max-w-md mx-auto">
              {inNimiqPay 
                ? 'Send tips with NIM, USDC, or USDT instantly — just one scan, one tap, done.'
                : 'Paste your EVM or NIM address to generate a QR code. Supporters scan it to tip you in USDC, USDT, or NIM instantly.'
              }
            </p>
          </div>

          {/* ── Generator Card ─────────────────────────────── */}
          <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            {!submitted ? (
              <div className="glass-card glass-card-glow rounded-2xl p-6 space-y-5">
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
                    Wallet address (EVM or NIM)
                  </label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value.trim())}
                    placeholder="0x... or NQ07 0000 0000 ..."
                    spellCheck={false}
                    className="input-base w-full rounded-xl px-4 py-3.5 text-sm font-mono"
                  />
                  {address.length > 0 && !isValid && (
                    <p className="text-red-400/80 text-xs mt-2 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-red-400" />
                      {address.startsWith('NQ') ? 'Invalid NIM address format' : 'Invalid EVM address format'}
                    </p>
                  )}
                  {isValid && (
                    <p className="text-emerald-400/80 text-xs mt-2 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      {isNim ? 'NIM address — QR will be a Nimiq payment URI' : 'EVM address — QR will link to tip page'}
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
              <div className="glass-card glass-card-glow rounded-2xl p-6 flex flex-col items-center space-y-5 animate-scale-in">
                {/* QR Display */}
                <div className="flex items-center gap-3 self-start">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <IconCheck />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Your tip jar is ready!</h2>
                    <p className="text-xs text-neutral-500">
                      {isNim ? 'NIM Payment URI' : `${address.slice(0, 6)}...${address.slice(-4)}`}
                    </p>
                  </div>
                </div>

                <div
                  ref={qrRef}
                  className="bg-gradient-to-b from-blue-700 to-blue-800 p-4 rounded-2xl shadow-xl shadow-blue-950/30 w-full max-w-[280px]"
                >
                  {/* Header: Logo + Brand */}
                  <div className="flex items-center gap-2 mb-3">
                    <img src="/icon.png" alt="BaseTip" className="w-6 h-6 rounded-md" />
                    <div>
                      <p className="text-white text-sm font-bold leading-tight">BaseTip</p>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="relative bg-white p-3 rounded-xl">
                    <div className="relative">
                      <QRCodeCanvas value={qrContent} size={230} level="H" />
                      {/* Base logo overlay in center */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <img src="/icon.png" alt="" className="w-9 h-9 rounded-md border-2 border-white shadow-lg" />
                      </div>
                    </div>
                  </div>

                  {/* Token badges */}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    {qrTokens.map((token) => (
                      <span
                        key={token}
                        className="px-2.5 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold tracking-wide"
                      >
                        {token}
                      </span>
                    ))}
                  </div>

                  {/* Scan text */}
                  <p className="text-center text-[10px] font-bold tracking-[0.2em] text-blue-200/70 mt-2">
                    SCAN TO TIP
                  </p>
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
                      <span className="truncate font-mono">{qrContent}</span>
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
                  className="glass-card glass-card-glow rounded-xl p-5 space-y-2 group hover:border-blue-500/20 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-blue-400/60 group-hover:text-blue-400 transition-colors">{s.num}</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent" />
                  </div>
                  <h4 className="text-sm font-semibold group-hover:text-blue-100 transition-colors">{s.title}</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed group-hover:text-neutral-400 transition-colors">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────── */}
        <footer className="w-full px-6 py-6 border-t border-neutral-800/50 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-neutral-600">
              BaseTip — Non-custodial tip jar. EVM & NIM addresses supported.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-neutral-600 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-500/50" />
                5% platform fee
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-700" />
              <span className="text-xs text-neutral-600">USDC · USDT · NIM</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
