#!/usr/bin/env bash
# Deploy TipRouter ke Base Mainnet
# ==================================
# Cara pakai:
#   1. Copy .env.example ke .env, isi semua variabel
#   2. Jalankan: bash deploy.sh

set -e

# Load environment
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Validate required vars
if [ -z "$PRIVATE_KEY" ]; then
    echo "ERROR: PRIVATE_KEY belum di-set di file .env"
    exit 1
fi
if [ -z "$TREASURY_ADDRESS" ]; then
    echo "ERROR: TREASURY_ADDRESS belum di-set di file .env"
    exit 1
fi
if [ -z "$OWNER_ADDRESS" ]; then
    echo "ERROR: OWNER_ADDRESS belum di-set di file .env"
    exit 1
fi

# Default USDC address (Base Mainnet)
USDC_ADDRESS=${USDC_ADDRESS:-0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913}
RPC_URL=${RPC_URL:-https://mainnet.base.org}
CHAIN_ID=${CHAIN_ID:-8453}

echo ""
echo "=== Deploying TipRouter to Base Mainnet ==="
echo ""
echo "  USDC:     $USDC_ADDRESS"
echo "  Treasury: $TREASURY_ADDRESS"
echo "  Owner:    $OWNER_ADDRESS"
echo "  Network:  $RPC_URL (Chain ID: $CHAIN_ID)"
echo ""

VERIFY_FLAG=""
if [ -n "$BASESCAN_API_KEY" ]; then
    VERIFY_FLAG="--verify --etherscan-api-key $BASESCAN_API_KEY"
else
    echo "WARNING: BASESCAN_API_KEY belum di-set — contract tidak auto-verify"
    echo ""
fi

forge create src/TipRouter.sol:TipRouter \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --chain-id "$CHAIN_ID" \
  --broadcast \
  $VERIFY_FLAG \
  --constructor-args \
    "$USDC_ADDRESS" \
    "$TREASURY_ADDRESS" \
    "$OWNER_ADDRESS"

echo ""
echo "=== Deploy successful! ==="
echo ""
echo "Next steps:"
echo "  1. Copy the contract address above"
echo "  2. Paste into frontend/.env.local as NEXT_PUBLIC_TIP_ROUTER_ADDRESS"
echo "  3. Verify on Basescan: https://basescan.org/address/<CONTRACT>#code"
echo ""
