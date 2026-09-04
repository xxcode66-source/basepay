# BasePay

**The universal tip jar — powered by Nimiq Pay.**

Non-custodial, multi-currency tip jar. Generate a personal tip link, share it anywhere, receive tips in **USDC**, **USDT**, or **NIM** instantly.

Runs as a [Nimiq Pay Mini App](https://nimiq.dev/mini-apps) and as a standalone web app.

## Features

- **Multi-Currency Tipping** — Send tips in USDC (permit), USDT (approve + transfer), or native NIM
- **Nimiq Pay Mini App** — Runs inside Nimiq Pay with injected wallet providers, no extension needed
- **QR Code Generator** — Enter your wallet address, get a scannable tip jar link + QR code
- **One-tap Tipping** — Quick amount buttons ($1, $5, $10, $25)
- **Tip with a Message** — Attach a personal note, emitted on-chain for the OBS overlay
- **Tip Goal** — Set a funding target, track progress from on-chain data
- **Tip History Feed** — On-chain history via `eth_getLogs` + live event polling
- **Basenames** — Human-readable names instead of raw addresses (e.g. `dino.base.eth`)
- **Share to Social** — Twitter/X share, native Web Share, Nimiq Pay deeplink, copy link
- **OBS Overlay** — Real-time tip alerts for streamers (browser source)
- **PWA** — Installable app shell with service worker
- **Non-custodial** — Funds go directly from sender to recipient, never stored in contract

## How It Works

### USDC (EIP-2612 Permit)
1. Supporter picks amount, signs one free permit signature
2. Contract calls `USDC.permit()` + routes transfers — 95% to creator, 5% to treasury
3. One signature, one transaction

### USDT (Approve + Transfer)
1. Supporter picks amount, approves TipRouterUSDT to spend USDT
2. Supporter calls `tip()` — contract routes transfers via `safeTransferFrom`
3. Two transactions, same 5% fee model

### NIM (Native Transfer)
1. Supporter picks amount in NIM, enters recipient's NIM address
2. Nimiq Pay sends NIM directly wallet-to-wallet via `sendBasicTransactionWithData`
3. No smart contract, no fees — pure P2P

## Architecture

```
basepay/
├── contracts/
│   ├── src/
│   │   ├── TipRouter.sol             # USDC router (permit, 5% fee)
│   │   └── TipRouterUSDT.sol         # USDT router (approve+transferFrom, 5% fee)
│   ├── test/
│   │   ├── TipRouter.t.sol
│   │   └── TipRouterUSDT.t.sol
│   ├── deploy.sh / deploy.ps1        # Deploy TipRouter (USDC)
│   └── deploy-usdt.sh / deploy-usdt.ps1  # Deploy TipRouterUSDT
└── frontend/                          # Next.js 14 App Router
    ├── app/
    │   ├── page.tsx                   # Homepage — QR code generator
    │   ├── layout.tsx                 # Root layout, PWA metadata
    │   ├── providers.tsx              # Wagmi + RainbowKit + SW registration
    │   ├── tip/[address]/             # Tip payment page (USDC/USDT/NIM)
    │   ├── overlay/[address]/         # OBS browser source overlay
    │   └── goal/[address]/            # Goal configuration page
    ├── components/
    │   ├── TipHistory.tsx             # On-chain tip history + real-time events
    │   ├── ShareButtons.tsx           # Twitter, native share, Nimiq deeplink
    │   └── ContractBanner.tsx         # Verified contract links
    ├── lib/
    │   ├── contracts.ts               # ABI + contract addresses
    │   ├── wagmi.ts                   # Wagmi config (Base + Base Sepolia)
    │   ├── nimiq.ts                   # Nimiq Pay env detection + provider
    │   ├── useNimiqEvm.ts             # EVM provider hook for Nimiq Pay
    │   ├── basename.tsx               # Basenames resolution hook
    │   └── ui-icons.tsx               # Shared SVG icon components
    └── public/
        ├── manifest.json              # PWA manifest
        ├── sw.js                      # Service worker
        └── icon-192.png, icon-512.png
```

## Production Contracts

Both contracts are deployed on **Base mainnet** (Chain ID: 8453):

| Contract | Address | Token | Method |
|----------|---------|-------|--------|
| TipRouter | `0xBeEb9378d95465db4d865dBE6Dae6E74f384bBd6` | USDC | EIP-2612 permit |
| TipRouterUSDT | *(set after deploy)* | USDT | approve + transferFrom |

Both route **95% to the creator** and **5% to the treasury**. Fees are `constant` — cannot be changed by the owner.

## Nimiq Pay Integration

BasePay runs as a **Nimiq Pay Mini App**, meaning:

- **No wallet extension needed** — Nimiq Pay injects `window.ethereum` (EVM) and the Nimiq provider directly
- **Auto-connected** — users are already authenticated via Nimiq Pay
- **NIM native tipping** — uses `sendBasicTransactionWithData()` for P2P NIM transfers
- **Deeplink sharing** — `nimiqpay://miniapp?url=your-app.com`
- **Dual mode** — works inside Nimiq Pay AND as a standalone web app with RainbowKit

### Environment Detection

```typescript
import { isNimiqPay, useNimiqProvider } from '@/lib/nimiq';

// Detect if running inside Nimiq Pay
if (isNimiqPay()) {
  // Use injected providers — no ConnectButton needed
} else {
  // Fall back to RainbowKit wallet connection
}
```

## Quick Start

### 1. Deploy the contracts

```bash
cd contracts
forge install
forge test -vvv

# Deploy USDC router
bash deploy.sh

# Deploy USDT router
bash deploy-usdt.sh
```

### 2. Configure the frontend

```bash
cd frontend
cp .env.local.example .env.local
# Fill in your values:
#   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID   — from cloud.walletconnect.com
#   NEXT_PUBLIC_TIP_ROUTER_ADDRESS         — USDC TipRouter address
#   NEXT_PUBLIC_USDC_ADDRESS               — 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
#   NEXT_PUBLIC_TIP_ROUTER_USDT_ADDRESS    — USDT TipRouter address
#   NEXT_PUBLIC_USDT_ADDRESS               — 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2
#   NEXT_PUBLIC_APP_URL                    — https://your-domain.com
```

### 3. Run

```bash
npm install
npm run dev     # http://localhost:3000
```

## End-to-end Flow

1. Creator deploys `TipRouter` and/or `TipRouterUSDT`, sets the treasury address
2. Creator opens `/` → enters wallet address → gets QR code + tip jar link
3. Creator shares link/QR on stream overlay, website, bio, or via Nimiq Pay deeplink
4. Supporter opens `/tip/[address]` → app detects environment:
   - **In Nimiq Pay**: auto-connected, picks USDC / USDT / NIM
   - **In browser**: connects wallet via RainbowKit, picks USDC / USDT
5. Supporter picks amount, optionally adds a message → clicks **Send Tip**
6. For USDC: one permit signature → one transaction
7. For USDT: one approve transaction → one tip transaction
8. For NIM: one native NIM transfer (wallet-to-wallet)
9. Funds route: 95% to creator, 5% to treasury — non-custodial, instant

## Security

- **Non-custodial**: Contracts never hold balance. Funds go directly from sender to recipient.
- **USDC**: Uses `permit()` (EIP-2612) — one signature, no separate approve tx
- **USDT**: Uses `approve()` + `safeTransferFrom()` — standard ERC-20 pattern
- **NIM**: Pure P2P transfer via Nimiq Pay — no smart contract involved
- **ReentrancyGuard**: `nonReentrant` on both tip functions
- **Immutable fee**: `PLATFORM_FEE_BPS = 500` (5%) is `constant` — owner cannot change it
- **SafeERC20**: Handles non-standard ERC20 tokens safely
- **Ownable**: Only owner can update the treasury address

## OBS Overlay

Use this URL as an OBS Browser Source:

```text
https://your-domain.com/overlay/<STREAMER_ADDRESS>
```

The overlay polls Base mainnet logs directly and listens for the `TipAlert`
event, including the optional message. Use a new tip after the overlay is open
to test an alert.

## Tech Stack

| Layer | Tech |
|-------|------|
| Smart Contract | Solidity 0.8.24, Foundry, OpenZeppelin |
| Frontend | Next.js 14, React 18, TypeScript |
| Web3 (EVM) | wagmi v2, viem v2, RainbowKit |
| Web3 (Nimiq) | @nimiq/mini-app-sdk |
| Chains | Base (mainnet + Sepolia), Nimiq |
| Tokens | USDC, USDT (Base), NIM (native) |
| Styling | Tailwind CSS, custom glass-morphism design system |
| PWA | Service Worker, Web App Manifest |

## Nimiq Mini Apps Competition

BasePay is submitted to the [Nimiq Mini Apps Competition](https://miniappscompetition.com) under the **Creator & Media** category.

- Supports **NIM** native tipping via `sendBasicTransactionWithData` (bonus points)
- Supports **USDT** on Base via TipRouterUSDT contract
- Fully functional, open-source, runs inside Nimiq Pay
