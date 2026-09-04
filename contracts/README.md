# BasePay — Smart Contract

`TipRouter` uses USDC EIP-2612 permits. The sender signs one typed-data message
off-chain; the router calls `permit()` and routes the fee and streamer amount in
one transaction. No separate USDC `approve()` transaction is required.

## Setup (Foundry)

```bash
forge init --no-commit .
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std
```

Tambahkan remapping di `foundry.toml`:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
remappings = [
    "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/",
    "forge-std/=lib/forge-std/src/",
]
```

## Test

```bash
forge test -vvv
```

## Deploy ke Base

Alamat USDC resmi (Circle):

| Jaringan       | Chain ID | USDC Address                                  |
|----------------|----------|------------------------------------------------|
| Base Mainnet   | 8453     | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`   |
| Base Sepolia   | 84532    | `0x036CbD53842c5426634e7929541eC2318f3dCF7e`   |

```bash
forge create src/TipRouter.sol:TipRouter \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --constructor-args \
    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
    <TREASURY_ADDRESS> \
    <OWNER_ADDRESS> \
  --verify --etherscan-api-key $BASESCAN_API_KEY
```

Untuk testnet dulu (rekomendasi sebelum submit hackathon), pakai
`https://sepolia.base.org` dan alamat USDC Sepolia di atas — bisa dapat
testnet USDC dari [Circle Faucet](https://faucet.circle.com).

## Contract API

The constructor is:

```solidity
TipRouter(address usdc, address treasuryAddress, address initialOwner)
```

The tip call is:

```solidity
tip(address streamer, uint256 amount, uint256 deadline, uint256 nonce,
  uint8 v, bytes32 r, bytes32 s)
```

The contract emits both `TipSent` and `TipAlert`. `TipAlert` includes the
optional message used by the OBS overlay.

## Catatan keamanan

- Kontrak **non-custodial**: `USDC.permit()` memberi allowance sementara ke
  router, lalu dana lewat via dua `transferFrom` langsung dari pengirim ke
  `treasury` dan `streamer`.
- `nonReentrant` tetap dipasang di `tip()` sebagai defense-in-depth.
- Fee (`PLATFORM_FEE_BPS = 500` → 5%) bersifat `constant` (bukan `mutable`)
  sehingga tidak bisa diubah owner secara diam-diam — hanya alamat treasury
  yang bisa diganti.
- Gunakan `SafeERC20` untuk kompatibilitas transfer token.

## Deploy via Multisig (Recommended)

**JANGAN deploy dengan EOA (wallet biasa).** Gunakan **Safe (Gnosis) multisig**
sebagai owner kontrak, sehingga perubahan `treasuryAddress` memerlukan
persetujuan multiple signer.

### 1. Buat Safe multisig

Buka [safe.global](https://safe.global) → Create Account di **Base** network.
Tambahkan 2–3 signer dengan threshold 2-of-3.

### 2. Deploy contract

```bash
forge create src/TipRouter.sol:TipRouter \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --constructor-args \
    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
    <SAFE_TREASURY_ADDRESS> \
    <SAFE_MULTISIG_ADDRESS> \
  --verify --etherscan-api-key $BASESCAN_API_KEY
```

**Penting:**
- `<SAFE_TREASURY_ADDRESS>` — alamat Safe multisig yang menerima fee
- `<SAFE_MULTISIG_ADDRESS>` — alamat Safe multisig sebagai **owner** kontrak
- Deployer EOA hanya dipakai untuk deploy, bukan sebagai owner

### 3. Verifikasi di Basescan

Setelah deploy, pastikan contract ter-verify di Basescan:
```
https://basescan.org/address/<CONTRACT_ADDRESS>#code
```

User bisa cek sendiri bahwa contract address yang mereka interact dengan
adalah contract yang asli dan ter-verify.
