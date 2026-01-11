# Create Organization in Coordi Database
# This script registers a user and creates an organization with all required records

param(
    [string]$Email = "admin@example.com",
    [string]$Password = "admin123456",
    [string]$OrganizationName = "My Business",
    [string]$ApiUrl = "https://coordi-api.onrender.com"
)

Write-Host "`n=== Creating Organization in Coordi ===" -ForegroundColor Cyan
Write-Host "Email: $Email" -ForegroundColor Yellow
Write-Host "Organization: $OrganizationName" -ForegroundColor Yellow
Write-Host "API URL: $ApiUrl`n" -ForegroundColor Gray

$body = @{
    email = $Email
    password = $Password
    organizationName = $OrganizationName
} | ConvertTo-Json

Write-Host "Registering..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "`n✅ SUCCESS! Organization created." -ForegroundColor Green
    Write-Host "`nOrganization Details:" -ForegroundColor Cyan
    Write-Host "  Email: $($response.user.email)" -ForegroundColor White
    Write-Host "  User ID: $($response.user.id)" -ForegroundColor White
    Write-Host "  Token: $($response.token.Substring(0, 50))..." -ForegroundColor Gray
    
    Write-Host "`n✅ Created records:" -ForegroundColor Green
    Write-Host "  - Organization" -ForegroundColor White
    Write-Host "  - User account" -ForegroundColor White
    Write-Host "  - AgentProfile (AI voice settings)" -ForegroundColor White
    Write-Host "  - BusinessProfile (company info)" -ForegroundColor White
    Write-Host "  - Integration (Twilio/Calendly settings)" -ForegroundColor White
    
    Write-Host "`n🎉 You can now test calling your Twilio number!" -ForegroundColor Green
    Write-Host "   Make a call and check the logs for: '✅ Organization found'" -ForegroundColor Gray
    
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorDetails) {
            Write-Host "Details: $($errorDetails.error)" -ForegroundColor Red
            if ($errorDetails.error -like "*already exists*") {
                Write-Host "`n💡 Tip: Use a different email address or use the login endpoint instead." -ForegroundColor Yellow
            }
        } else {
            Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "`n💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check that the API is running: $ApiUrl/" -ForegroundColor Gray
    Write-Host "  2. Check your internet connection" -ForegroundColor Gray
    Write-Host "  3. Try a different email address if user already exists" -ForegroundColor Gray
    exit 1
}
