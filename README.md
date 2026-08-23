# BasePay

Non-custodial USDC tip jar on the **Base** network. Generate a personal tip link, share it anywhere, receive tips instantly.

## Features

- **QR Code Generator** — Enter your Base wallet address, get a scannable tip jar link + QR code
- **One-tap Tipping** — Quick amount buttons ($1, $5, $10, $25), signed with EIP-2612
- **Tip with a Message** — Attach a personal note, emitted on-chain for the OBS overlay
- **Tip Goal** — Set a funding target, track progress from on-chain data
- **Tip History Feed** — On-chain history via `eth_getLogs` + live event polling
- **Basenames** — Human-readable names instead of raw addresses (e.g. `dino.base.eth`)
- **Share to Social** — Twitter/X share, native Web Share, copy link
- **OBS Overlay** — Real-time tip alerts for streamers (browser source)
- **PWA** — Installable app shell with service worker
- **Non-custodial** — Funds go directly from sender to recipient, never stored in contract

## Architecture

```
basepay/
├── contracts/                    # Foundry smart contract
│   ├── src/TipRouter.sol         # Non-custodial USDC router (5% platform fee)
│   └── test/TipRouter.t.sol      # Foundry tests
└── frontend/                     # Next.js 14 App Router
    ├── app/
    │   ├── page.tsx              # Homepage — QR code generator
    │   ├── layout.tsx            # Root layout, PWA metadata
    │   ├── providers.tsx         # Wagmi + RainbowKit + SW registration
    │   ├── error.tsx             # Global error boundary
    │   ├── not-found.tsx         # Custom 404
    │   ├── tip/[address]/        # Tip payment page
    │   ├── overlay/[address]/    # OBS browser source overlay
    │   └── goal/[address]/       # Goal configuration page
    ├── components/
    │   ├── TipHistory.tsx        # On-chain tip history + real-time events
    │   └── ShareButtons.tsx      # Twitter, native share, copy link
    ├── lib/
    │   ├── contracts.ts          # ABI + contract addresses
    │   ├── wagmi.ts              # Wagmi config (Base + Base Sepolia)
    │   ├── basename.tsx          # Basenames resolution hook
    │   └── ui-icons.tsx          # Shared SVG icon components
    └── public/
        ├── manifest.json         # PWA manifest
        ├── sw.js                 # Service worker
        ├── icon-192.png          # PWA icons
        ├── icon-512.png
        └── favicon.ico
```

  ## Production contract

  The current Base mainnet TipRouter is verified on Basescan:

  ```text
  0xBeEb9378d95465db4d865dBE6Dae6E74f384bBd6
  ```

  It uses Base USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) and routes 95%
  of each tip to the streamer and 5% to the treasury.

## Quick Start

### 1. Deploy the contract

```bash
cd contracts
forge install
forge test -vvv
forge create src/TipRouter.sol:TipRouter \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --constructor-args \
    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
    <TREASURY_ADDRESS> \
    <OWNER_ADDRESS> \
  --verify --etherscan-api-key $BASESCAN_API_KEY
```

The repository also includes `deploy.sh`, which deploys the same three-argument
constructor and verifies the contract automatically when `BASESCAN_API_KEY` is
set.

### 2. Configure the frontend

```bash
cd frontend
cp .env.local.example .env.local
# Fill in your values:
#   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID  — from cloud.walletconnect.com
#   NEXT_PUBLIC_TIP_ROUTER_ADDRESS        — 0xBeEb9378d95465db4d865dBE6Dae6E74f384bBd6
#   NEXT_PUBLIC_USDC_ADDRESS              — 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (Base mainnet)
#   NEXT_PUBLIC_APP_URL                   — https://your-domain.com
```

### 3. Run

```bash
npm install
npm run dev     # http://localhost:3000
```

## End-to-end flow

1. Creator deploys `TipRouter` and sets the treasury address
2. Creator opens `/` → enters wallet address → gets QR code + tip jar link
3. Creator shares link/QR on stream overlay, website, bio, etc.
4. Supporter scans QR → opens `/tip/[address]` → connects wallet
5. Supporter picks amount, optionally adds a message → clicks **Send Tip**
6. Wallet asks for one free EIP-2612 typed-data signature
7. The wallet sends `tip()`; the contract calls `USDC.permit()` and routes both transfers
8. Funds route: 95% to creator, 5% to treasury — non-custodial, instant

## Security

- **Non-custodial**: `tip()` uses `USDC.permit()` and two `safeTransferFrom` calls — funds go directly from sender to treasury + recipient. Contract never holds balance.
- **ReentrancyGuard**: `nonReentrant` on `tip()` as defense-in-depth
- **Immutable fee**: `PLATFORM_FEE_BPS = 500` (5%) is `constant` — owner cannot change it
- **SafeERC20**: Handles non-standard ERC20 tokens safely
- **Ownable**: Only owner can update the treasury address
- **Permit validation**: Invalid EIP-2612 signatures revert before any transfer

## OBS overlay

Use this URL as an OBS Browser Source:

```text
https://basepay-omega.vercel.app/overlay/<STREAMER_ADDRESS>
```

The overlay polls Base mainnet logs directly and listens for the `TipAlert`
event, including the optional message. Use a new tip after the overlay is open
to test an alert.

## Tech Stack

| Layer | Tech |
|-------|------|
| Smart Contract | Solidity 0.8.24, Foundry, OpenZeppelin |
| Frontend | Next.js 14, React 18, TypeScript |
| Web3 | wagmi v2, viem v2, RainbowKit |
| Chain | Base (mainnet + Sepolia) |
| Styling | Tailwind CSS, custom glass-morphism design system |
| PWA | Service Worker, Web App Manifest |
