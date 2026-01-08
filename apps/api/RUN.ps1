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
    Write-Host "Coordi API - Helper Script" -ForegroundColor Cyan
    Write-Host "`nUsage: .\RUN.ps1 [command]`n" -ForegroundColor Yellow
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  install    - Install dependencies" -ForegroundColor White
    Write-Host "  dev        - Start development server" -ForegroundColor White
    Write-Host "  generate   - Generate Prisma Client" -ForegroundColor White
    Write-Host "  migrate    - Run database migrations" -ForegroundColor White
    Write-Host "  studio     - Open Prisma Studio" -ForegroundColor White
    Write-Host "  test       - Run API tests" -ForegroundColor White
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
        Write-Host "Starting development server..." -ForegroundColor Cyan
        npm run dev
    }
    "generate" {
        Write-Host "Generating Prisma Client..." -ForegroundColor Cyan
        npm run prisma:generate
    }
    "migrate" {
        Write-Host "Running database migrations..." -ForegroundColor Cyan
        npm run prisma:migrate
    }
    "studio" {
        Write-Host "Opening Prisma Studio..." -ForegroundColor Cyan
        npm run prisma:studio
    }
    "test" {
        Write-Host "Running API tests..." -ForegroundColor Cyan
        npx tsx src/test/test-endpoints.ts
    }
    default {
        Write-Host "Unknown command: $command" -ForegroundColor Red
        Write-Host "Run .\RUN.ps1 without arguments to see available commands" -ForegroundColor Yellow
        exit 1
    }
}
