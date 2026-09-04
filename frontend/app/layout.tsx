import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import BackgroundEffects from '@/components/BackgroundEffect';
import ErrorBoundary from '@/components/ErrorBoundary';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  themeColor: '#0052FF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'BasePay — Tip with NIM, USDC, or USDT',
    template: '%s | BasePay',
  },
  description:
    'Send tips instantly with NIM, USDC, or USDT on Base. Works in Nimiq Pay and any web browser — one scan, one tap, done.',
  other: {
    'base:app_id': '6a8c5e7d39d7d26f4bad1ab2',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BasePay',
  },
  openGraph: {
    title: 'BasePay — Tip with NIM, USDC, or USDT',
    description:
      'Send tips instantly with multiple tokens on Base. No sign-up, no middleman.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BasePay — Instant Tips',
    description: 'Send tips with NIM, USDC, or USDT on Base. One scan, one tap.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        <ErrorBoundary>
          <BackgroundEffects />
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
