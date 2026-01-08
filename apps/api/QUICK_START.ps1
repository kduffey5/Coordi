# Quick Start Script for Coordi API
# This script ensures Node.js/npm is in PATH and runs common commands

# Add Node.js to PATH for this session
$nodePath = "C:\Program Files\nodejs"
if (Test-Path $nodePath) {
    if ($env:Path -notlike "*$nodePath*") {
        $env:Path += ";$nodePath"
        Write-Host "✓ Added Node.js to PATH" -ForegroundColor Green
    }
} else {
    Write-Host "✗ Node.js not found at $nodePath" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verify npm is available
try {
    $npmVersion = npm --version
    Write-Host "✓ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found. Please restart your terminal after installing Node.js" -ForegroundColor Red
    exit 1
}

# Change to API directory
Set-Location $PSScriptRoot

Write-Host "`n=== Coordi API ===" -ForegroundColor Cyan
Write-Host "Current directory: $(Get-Location)`n" -ForegroundColor Gray

# Show menu
Write-Host "Available commands:" -ForegroundColor Yellow
Write-Host "  1. Install dependencies" -ForegroundColor White
Write-Host "  2. Start development server" -ForegroundColor White
Write-Host "  3. Generate Prisma Client" -ForegroundColor White
Write-Host "  4. Run database migrations" -ForegroundColor White
Write-Host "  5. Open Prisma Studio" -ForegroundColor White
Write-Host "  6. Run tests" -ForegroundColor White
Write-Host "  0. Exit`n" -ForegroundColor White

$choice = Read-Host "Enter your choice (1-6, or 0 to exit)"

switch ($choice) {
    "1" {
        Write-Host "`nInstalling dependencies..." -ForegroundColor Cyan
        npm install
    }
    "2" {
        Write-Host "`nStarting development server..." -ForegroundColor Cyan
        Write-Host "Server will run on http://localhost:3001" -ForegroundColor Gray
        npm run dev
    }
    "3" {
        Write-Host "`nGenerating Prisma Client..." -ForegroundColor Cyan
        npm run prisma:generate
    }
    "4" {
        Write-Host "`nRunning database migrations..." -ForegroundColor Cyan
        npm run prisma:migrate
    }
    "5" {
        Write-Host "`nOpening Prisma Studio..." -ForegroundColor Cyan
        Write-Host "Will open at http://localhost:5555" -ForegroundColor Gray
        npm run prisma:studio
    }
    "6" {
        Write-Host "`nRunning tests..." -ForegroundColor Cyan
        npx tsx src/test/test-endpoints.ts
    }
    "0" {
        Write-Host "Goodbye!" -ForegroundColor Green
        exit 0
    }
    default {
        Write-Host "Invalid choice. Run the script again." -ForegroundColor Red
    }
}
