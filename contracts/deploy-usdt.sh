#!/usr/bin/env bash
# Deploy TipRouterUSDT ke Base Mainnet
# ==================================
# Cara pakai:
#   1. Copy .env.example ke .env, isi private key & Basescan API key
#   2. Jalankan: bash deploy-usdt.sh

set -e

# Load environment
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Validate
if [ -z "$PRIVATE_KEY" ]; then
    echo "ERROR: PRIVATE_KEY belum di-set di file .env"
    exit 1
fi

echo ""
echo "=== Deploying TipRouterUSDT to Base Mainnet ==="
echo ""
echo "  USDT:     0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"
echo "  Treasury: 0xB3082C43B1A881635ddB0e0F4d42F83da52eA03F"
echo "  Owner:    0xc8446B28203A7324406d48Ce879F32fbE6f962a4"
echo "  Network:  https://mainnet.base.org (Chain ID: 8453)"
echo ""

VERIFY_FLAG=""
if [ -n "$BASESCAN_API_KEY" ]; then
    VERIFY_FLAG="--verify --etherscan-api-key $BASESCAN_API_KEY"
else
    echo "WARNING: BASESCAN_API_KEY belum di-set — contract tidak auto-verify"
    echo ""
fi

forge create src/TipRouterUSDT.sol:TipRouterUSDT \
  --rpc-url https://mainnet.base.org \
  --private-key "$PRIVATE_KEY" \
  --chain-id 8453 \
  --broadcast \
  $VERIFY_FLAG \
  --constructor-args \
    0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2 \
    0xB3082C43B1A881635ddB0e0F4d42F83da52eA03F \
    0xc8446B28203A7324406d48Ce879F32fbE6f962a4

echo ""
echo "=== Deploy successful! ==="
echo ""
echo "Next steps:"
echo "  1. Copy the contract address above"
echo "  2. Paste into frontend/.env.local as NEXT_PUBLIC_TIP_ROUTER_USDT_ADDRESS"
echo "  3. Verify on Basescan: https://basescan.org/address/<CONTRACT>#code"
echo ""
