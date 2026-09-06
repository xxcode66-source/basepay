# Deploy TipRouter ke Robinhood Chain Mainnet
# =============================================
# Cara pakai:
#   1. Copy file ini ke .env, isi private key
#   2. Jalankan: .\deploy-robinhood.ps1
#
# Robinhood Chain details:
#   Chain ID: 4663
#   RPC:      https://rpc.mainnet.chain.robinhood.com
#   Token:    USDG (0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168)
#   Explorer: https://robinhoodchain.blockscout.com

# Load environment
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*[^#]' -and $_ -match '=') {
            $key, $val = $_ -split '=', 2
            [Environment]::SetEnvironmentVariable($key.Trim(), $val.Trim())
        }
    }
}

# Validate
if (-not $env:PRIVATE_KEY) {
    Write-Host "ERROR: PRIVATE_KEY belum di-set di file .env" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Deploying TipRouter to Robinhood Chain ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  USDG:     0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" -ForegroundColor Gray
Write-Host "  Treasury: 0xB3082C43B1A881635ddB0e0F4d42F83da52eA03F" -ForegroundColor Gray
Write-Host "  Owner:    0xc8446B28203A7324406d48Ce879F32fbE6f962a4" -ForegroundColor Gray
Write-Host "  Network:  https://rpc.mainnet.chain.robinhood.com (Chain ID: 4663)" -ForegroundColor Gray
Write-Host ""

# Build command args
$args = @(
    "create",
    "src/TipRouter.sol:TipRouter",
    "--rpc-url", "https://rpc.mainnet.chain.robinhood.com",
    "--private-key", $env:PRIVATE_KEY,
    "--chain-id", "4663",
    "--broadcast"
)

# Note: Blockscout verification (if supported)
# Uncomment and adjust if Blockscout supports API verification
# if ($env:BLOCKSCOUT_API_KEY) {
#     $args += "--verify"
#     $args += "--etherscan-api-key"
#     $args += $env:BLOCKSCOUT_API_KEY
# }

$args += "--constructor-args"
$args += "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"  # USDG on Robinhood Chain
$args += "0xB3082C43B1A881635ddB0e0F4d42F83da52eA03F"  # Treasury
$args += "0xc8446B28203A7324406d48Ce879F32fbE6f962a4"  # Owner

# Deploy
& forge @args

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Deploy successful! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Copy the contract address above"
    Write-Host "  2. Paste into frontend/.env.local as NEXT_PUBLIC_RH_TIP_ROUTER_ADDRESS"
    Write-Host "  3. Verify on Blockscout: https://robinhoodchain.blockscout.com/address/<CONTRACT>#code"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "=== Deploy FAILED ===" -ForegroundColor Red
    Write-Host "Check the error above. Common issues:" -ForegroundColor Yellow
    Write-Host "  - Not enough ETH in deployer wallet for gas"
    Write-Host "  - Invalid private key format"
    Write-Host "  - Network RPC issue"
    Write-Host ""
}
