$ErrorActionPreference = "Stop"

$docsDir = "docs/voice/deepgram"
$overviewFile = Join-Path $docsDir "deepgram-api-overview.md"
$baseUrl = "https://developers.deepgram.com"

# Check if overview file exists
if (-not (Test-Path $overviewFile)) {
    Write-Error "Overview file not found: $overviewFile"
}

# Read content
$content = Get-Content $overviewFile -Raw

# Regex to find links like (/reference/...)
$pattern = '\((/reference/[^)]+)\)'
$linkMatches = [regex]::Matches($content, $pattern)

Write-Host "Found $($linkMatches.Count) links in overview file."

foreach ($match in $linkMatches) {
    $relativePath = $match.Groups[1].Value
    # Construct full URL with .md extension
    # Remove trailing slash if exists before appending .md, though deepgram urls usually don't have trailing slash in these links
    $url = "$baseUrl$relativePath.md"
    
    # Determine filename from the relative path to verify uniqueness
    # Remove leading slash and Replace slashes with dashes to create a flat file structure
    $cleanPath = $relativePath.TrimStart('/').Replace('/', '-')
    
    if (-not $cleanPath.EndsWith(".md")) {
        $fileName = "$cleanPath.md"
    }
    else {
        $fileName = $cleanPath
    }
    
    $outputPath = Join-Path $docsDir $fileName
    
    Write-Host "Downloading $url to $outputPath..."
    
    try {
        # Using curl (alias for Invoke-WebRequest in PS, but better to use Invoke-WebRequest explicitly or curl.exe if needed, 
        # but Invoke-RestMethod is good for text content)
        # We need headers to mimic a browser slightly or just plain request.
        # The user successfully used curl.exe before which is good.
        # Let's use Invoke-WebRequest to save directly to file.
        
        Invoke-WebRequest -Uri $url -OutFile $outputPath -UseBasicParsing
        
        Write-Host "Success: $fileName"
    }
    catch {
        Write-Warning "Failed to download $url : $_"
    }
    
    # Be nice to the server
    Start-Sleep -Milliseconds 200
}

Write-Host "Download complete."
