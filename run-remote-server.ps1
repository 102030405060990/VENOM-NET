$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPort = 8081
$firewallRule = 'VENOM NET Server 8081'
$tailscale = 'C:\Program Files\Tailscale\tailscale.exe'

if (-not (Test-Path -LiteralPath $tailscale)) {
    Write-Host 'Installing Tailscale...' -ForegroundColor Yellow
    winget install --id Tailscale.Tailscale --exact --source winget --accept-source-agreements --accept-package-agreements
    if (-not (Test-Path -LiteralPath $tailscale)) {
        Write-Host 'Tailscale installation failed. Install it manually, then run this script again.' -ForegroundColor Red
        exit 1
    }
}

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host 'Restarting with Administrator permissions...' -ForegroundColor Yellow
    Start-Process powershell.exe -Verb RunAs -ArgumentList '-ExecutionPolicy Bypass', '-File', ('"' + $MyInvocation.MyCommand.Path + '"')
    exit 0
}

if (-not (Get-NetFirewallRule -DisplayName $firewallRule -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $firewallRule -Direction Inbound -Protocol TCP -LocalPort $serverPort -Action Allow | Out-Null
    Write-Host 'Firewall rule created for port 8081.' -ForegroundColor Green
}

$status = & $tailscale status 2>&1 | Out-String
if ($status -match 'NeedsLogin|Logged out|not logged in') {
    Write-Host 'A browser will open. Sign in to Tailscale, then return here.' -ForegroundColor Cyan
    & $tailscale login
}

$tailscaleIp = (& $tailscale ip -4 2>$null | Select-Object -First 1).Trim()
if (-not $tailscaleIp) {
    Write-Host 'Tailscale has no address yet. Complete login, then run this script again.' -ForegroundColor Red
    exit 1
}

Write-Host ''
Write-Host "Developer URL: http://$tailscaleIp`:$serverPort" -ForegroundColor Green
Write-Host 'Keep this window open. Press Ctrl+C to stop the server.' -ForegroundColor Cyan
Write-Host ''

Set-Location $projectRoot
npm run dev