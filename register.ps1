# Coordi Registration Script
# Run this in PowerShell to register your organization

$body = @{
    email = "your@email.com"
    password = "yourpassword123"
    organizationName = "Your Business Name"
} | ConvertTo-Json

Write-Host "Registering organization..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://coordi-api.onrender.com/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "`n✅ Success! Organization registered." -ForegroundColor Green
    Write-Host "Email: $($response.user.email)" -ForegroundColor Yellow
    Write-Host "User ID: $($response.user.id)" -ForegroundColor Yellow
    Write-Host "Token: $($response.token.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host "`nYou can now test calling your Twilio number!" -ForegroundColor Green
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
