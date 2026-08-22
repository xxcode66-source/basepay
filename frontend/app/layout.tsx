import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import BackgroundEffects from '@/components/BackgroundEffects';

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
    default: 'BasePay — Send USDC Tips to Anyone, Anywhere',
    template: '%s | BasePay',
  },
  description:
    'Generate a personal tip jar link or QR code. Anyone can send you USDC instantly on the Base network — one scan, one tap, done.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BasePay',
  },
  openGraph: {
    title: 'BasePay — Send USDC Tips to Anyone, Anywhere',
    description:
      'Generate a personal tip jar. Send USDC instantly on Base — no sign-up, no middleman.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BasePay — Send USDC Tips to Anyone',
    description: 'One scan, one tap. Send USDC tips instantly on Base.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        <BackgroundEffects />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
