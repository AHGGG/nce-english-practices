Write-Host "=== Running Frontend E2E Tests ==="
uv run pytest tests/e2e
if ($LASTEXITCODE -ne 0) { 
    Write-Error "E2E Tests Failed!"
    exit 1 
}

Write-Host "=== Running Backend Unit Tests ==="
uv run pytest tests --ignore=tests/e2e
if ($LASTEXITCODE -ne 0) { 
    Write-Error "Backend Tests Failed!"
    exit 1 
}

Write-Host "✅ All Tests Passed Successfully!"
