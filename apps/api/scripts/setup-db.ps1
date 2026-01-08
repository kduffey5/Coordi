# Database Setup Script for Coordi
# This script helps verify your database connection

Write-Host "=== Coordi Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please create apps/api/.env file first." -ForegroundColor Yellow
    exit 1
}

# Check if DATABASE_URL is set
$envContent = Get-Content .env
$dbUrl = $envContent | Select-String "DATABASE_URL"

if (-not $dbUrl) {
    Write-Host "ERROR: DATABASE_URL not found in .env file!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Found DATABASE_URL in .env" -ForegroundColor Green
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Prisma generate failed!" -ForegroundColor Red
    Write-Host "Please check your DATABASE_URL in .env file" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Prisma Client generated" -ForegroundColor Green
Write-Host ""

Write-Host "Running database migrations..." -ForegroundColor Yellow
Write-Host "(This will create all database tables)" -ForegroundColor Gray
Write-Host ""

npm run prisma:migrate

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Migration failed!" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Database is running and accessible" -ForegroundColor Yellow
    Write-Host "  2. DATABASE_URL is correct in .env" -ForegroundColor Yellow
    Write-Host "  3. Database credentials are valid" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "You can now:" -ForegroundColor Cyan
Write-Host "  1. Start the API: npm run dev" -ForegroundColor White
Write-Host "  2. Open Prisma Studio: npm run prisma:studio" -ForegroundColor White
Write-Host ""
