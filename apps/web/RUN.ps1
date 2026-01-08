# Simple script to ensure npm is available and run commands
# Usage: .\RUN.ps1 install  or  .\RUN.ps1 dev  etc.

# Add Node.js to PATH
$nodePath = "C:\Program Files\nodejs"
if (Test-Path $nodePath) {
    if ($env:Path -notlike "*$nodePath*") {
        $env:Path += ";$nodePath"
    }
}

# Change to script directory
Set-Location $PSScriptRoot

# Get command from arguments, default to showing help
$command = $args[0]

if (-not $command) {
    Write-Host "Coordi Web - Helper Script" -ForegroundColor Cyan
    Write-Host "`nUsage: .\RUN.ps1 [command]`n" -ForegroundColor Yellow
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  install    - Install dependencies" -ForegroundColor White
    Write-Host "  dev        - Start development server" -ForegroundColor White
    Write-Host "  build      - Build for production" -ForegroundColor White
    Write-Host "  start      - Start production server" -ForegroundColor White
    exit 0
}

# Verify npm is available
try {
    $null = npm --version 2>&1
} catch {
    Write-Host "✗ npm not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Write-Host "Or restart your terminal after installing Node.js." -ForegroundColor Yellow
    exit 1
}

# Execute command
switch ($command.ToLower()) {
    "install" {
        Write-Host "Installing dependencies..." -ForegroundColor Cyan
        npm install
    }
    "dev" {
        Write-Host "Starting Next.js development server..." -ForegroundColor Cyan
        Write-Host "Will open at http://localhost:3000" -ForegroundColor Gray
        npm run dev
    }
    "build" {
        Write-Host "Building for production..." -ForegroundColor Cyan
        npm run build
    }
    "start" {
        Write-Host "Starting production server..." -ForegroundColor Cyan
        npm run start
    }
    default {
        Write-Host "Unknown command: $command" -ForegroundColor Red
        Write-Host "Run .\RUN.ps1 without arguments to see available commands" -ForegroundColor Yellow
        exit 1
    }
}
