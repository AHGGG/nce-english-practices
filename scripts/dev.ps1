param(
    [switch]$Https
)

Write-Host "Starting NCE English Practices Server..."
if ($Https) {
    $env:USE_HTTPS = "true"
    Write-Host "Mode: HTTPS Enabled" -ForegroundColor Green
} else {
    $env:USE_HTTPS = "false"
    Write-Host "Mode: HTTP (Default)" -ForegroundColor Cyan
}

uv run python -m app.main
