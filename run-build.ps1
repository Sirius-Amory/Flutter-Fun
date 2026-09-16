$ErrorActionPreference = 'Stop'

$swagPort = 4280
Get-NetTCPConnection -LocalPort $swagPort -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop
    }
    catch {
        # Ignore processes already gone or protected by OS
    }
}

$funcPort = 7071
Get-NetTCPConnection -LocalPort $funcPort -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop
    }
    catch {
        # Ignore processes already gone or protected by OS
    }
}

$repoRoot = $PSScriptRoot
$gameDir = Join-Path $repoRoot 'game'
$distDir = Join-Path $gameDir 'dist'

Set-Location $gameDir
npm run build

if (Test-Path (Join-Path $gameDir 'public\404.html')) {
    Copy-Item (Join-Path $gameDir 'public\404.html') (Join-Path $distDir '404.html') -Force
}

Set-Location (Join-Path $repoRoot 'api')
npm run build

$apiLog = Join-Path $repoRoot 'api\func.log'
$apiErrorLog = Join-Path $repoRoot 'api\func-error.log'
Start-Process -FilePath 'func.cmd' -ArgumentList 'start --port 7071' -WorkingDirectory (Join-Path $repoRoot 'api') -RedirectStandardOutput $apiLog -RedirectStandardError $apiErrorLog -WindowStyle Hidden

Set-Location $gameDir
npm run preview -- --host localhost --port 4280
