# How to Register - Simple Instructions

## Option 1: PowerShell One-Liner (Easiest)

1. **Open PowerShell** (Windows key → type "PowerShell" → Enter)

2. **Copy and paste this command** (replace the values in quotes):
```powershell
$body = @{email = "test@example.com"; password = "testpass123"; organizationName = "Test Business"} | ConvertTo-Json; Invoke-RestMethod -Uri "https://coordi-api.onrender.com/api/auth/register" -Method POST -ContentType "application/json" -Body $body
```

3. **Press Enter** - You should see a response with your token and user info

## Option 2: Use the Script

1. **Open PowerShell**
2. **Navigate to your project:**
   ```powershell
   cd "C:\Users\Kevin Duffey\Coordi"
   ```
3. **Edit the script:**
   ```powershell
   notepad register.ps1
   ```
   - Change `your@email.com` to your actual email
   - Change `yourpassword123` to your password
   - Change `Your Business Name` to your business name
   - Save and close

4. **Run it:**
   ```powershell
   .\register.ps1
   ```

## Option 3: Online REST Client (No Command Line)

1. Go to **https://reqbin.com/** or **https://www.postman.com/**
2. Choose **POST** method
3. Enter URL: `https://coordi-api.onrender.com/api/auth/register`
4. Set **Content-Type** header to: `application/json`
5. In the body, enter:
```json
{
  "email": "your@email.com",
  "password": "yourpassword123",
  "organizationName": "Your Business Name"
}
```
6. Click **Send**

## What Success Looks Like

You'll get a response like:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "your@email.com"
  }
}
```

## Troubleshooting

### "User already exists"
- Use a different email address, or
- Use the login endpoint instead: `POST /api/auth/login`

### Connection error
- Check that your API is deployed: Visit `https://coordi-api.onrender.com/` in browser
- Should see: `{"name":"Coordi API","status":"running",...}`

### Invalid email/password
- Email must be valid format
- Password must be at least 8 characters
