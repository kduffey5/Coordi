# How to Register an Organization

## Option 1: Using cURL (Command Line)

```bash
curl -X POST https://coordi-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword123",
    "organizationName": "Your Business Name"
  }'
```

## Option 2: Using PowerShell (Windows)

```powershell
$body = @{
    email = "your@email.com"
    password = "yourpassword123"
    organizationName = "Your Business Name"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://coordi-api.onrender.com/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

## Option 3: Using a REST Client (Postman, Insomnia, etc.)

- **Method**: POST
- **URL**: `https://coordi-api.onrender.com/api/auth/register`
- **Headers**: 
  - `Content-Type: application/json`
- **Body** (JSON):
```json
{
  "email": "your@email.com",
  "password": "yourpassword123",
  "organizationName": "Your Business Name"
}
```

## Success Response

You'll get back:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "your@email.com"
  }
}
```

## What Gets Created

When you register, the system automatically creates:
- ✅ **Organization** (with the name you provided)
- ✅ **User** (with your email and password)
- ✅ **AgentProfile** (with default AI voice settings)
- ✅ **BusinessProfile** (with your company name)
- ✅ **Integration** (for storing Twilio/Calendly settings)

## Verify It Worked

After registering, you can verify the organization exists by checking the logs when you make a test call. You should see:
```
✅ Organization found: { id: "...", name: "Your Business Name", ... }
```

Or you can log in to confirm:
```bash
curl -X POST https://coordi-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword123"
  }'
```
