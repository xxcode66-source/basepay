# Deploy TipRouter ke Base Mainnet
# ==================================
# Cara pakai:
#   1. Copy file ini ke .env, isi private key & Basescan API key
#   2. Jalankan: .\deploy.ps1

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
if (-not $env:BASESCAN_API_KEY) {
    Write-Host "WARNING: BASESCAN_API_KEY belum di-set — contract tidak auto-verify" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Deploying TipRouter to Base Mainnet ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  USDC:     0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" -ForegroundColor Gray
Write-Host "  Treasury: 0xB3082C43B1A881635ddB0e0F4d42F83da52eA03F" -ForegroundColor Gray
Write-Host "  Owner:    0xc8446B28203A7324406d48Ce879F32fbE6f962a4" -ForegroundColor Gray
Write-Host "  Network:  https://mainnet.base.org (Chain ID: 8453)" -ForegroundColor Gray
Write-Host ""

# Build command args
$args = @(
    "create",
    "src/TipRouter.sol:TipRouter",
    "--rpc-url", "https://mainnet.base.org",
    "--private-key", $env:PRIVATE_KEY,
    "--constructor-args",
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "0xB3082C43B1A881635ddB0e0F4d42F83da52eA03F",
        "0xc8446B28203A7324406d48Ce879F32fbE6f962a4",
    "--chain-id", "8453"
)

# Add verify flag if API key available
if ($env:BASESCAN_API_KEY) {
    $args += "--verify"
    $args += "--etherscan-api-key"
    $args += $env:BASESCAN_API_KEY
}

# Deploy
& forge @args

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Deploy successful! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Copy the contract address above"
    Write-Host "  2. Paste into frontend/.env.local as NEXT_PUBLIC_TIP_ROUTER_ADDRESS"
    Write-Host "  3. Verify on Basescan: https://basescan.org/address/<CONTRACT>#code"
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
