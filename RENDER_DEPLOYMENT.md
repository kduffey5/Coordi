# Render Deployment Configuration

## Overview

The Coordi backend is now configured to run on Render with automatic URL detection and proper environment variable handling.

## Key Updates for Render

### 1. Automatic WebSocket URL Detection

The Twilio webhook now automatically detects the server URL from the incoming request. This works on Render by:
- Using `TWILIO_STREAM_URL` environment variable if set (recommended for production)
- Falling back to auto-detection from request headers (`x-forwarded-proto`, `host`)
- Converting HTTP to WebSocket protocol (`ws://` or `wss://`)

### 2. Server Configuration

- **Host**: Binds to `0.0.0.0` (all network interfaces) - required for Render
- **Port**: Uses `PORT` environment variable (Render sets this automatically)
- **Logging**: Shows the actual server URL including Render's external URL if available

### 3. Environment Variables

#### Required on Render (API Service):
- `DATABASE_URL` - Auto-linked from database service
- `OPENAI_API_KEY` - Your OpenAI API key
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TWILIO_NUMBER` - Your Twilio phone number (+1234567890)
- `JWT_SECRET` - Random secret for JWT signing
- `NODE_ENV` - Set to `production`
- `FRONTEND_URL` - Your frontend URL (e.g., https://coordi-web.onrender.com)
- `TWILIO_STREAM_URL` - Recommended: wss://your-api-url.onrender.com/call
- `PORT` - Set automatically by Render (don't override)

#### Required on Render (Web Service):
- `NODE_ENV` - Set to `production`
- `NEXT_PUBLIC_API_URL` - Your API URL (e.g., https://coordi-api.onrender.com)

## render.yaml Configuration

The `render.yaml` file is configured with:
- Automatic database linking
- Correct build and start commands
- Environment variable defaults
- Proper service URLs

## Deployment Steps

1. **Push to GitHub**: Ensure your code is in a GitHub repository

2. **Create Blueprint** (Recommended):
   - Go to Render Dashboard → New → Blueprint
   - Connect your GitHub repository
   - Render will read `render.yaml` and create all services
   - Manually set secret environment variables (OPENAI_API_KEY, etc.)

3. **Or Create Services Manually**:
   - Follow the steps in `DEPLOYMENT.md`
   - Use the environment variables listed above

4. **Set Secret Environment Variables**:
   After services are created, go to each service → Environment and set:
   - `OPENAI_API_KEY` (keep as secret)
   - `TWILIO_ACCOUNT_SID` (keep as secret)
   - `TWILIO_AUTH_TOKEN` (keep as secret)
   - `JWT_SECRET` (keep as secret)
   - `TWILIO_NUMBER` (can be visible)

5. **Configure Twilio**:
   - Go to Twilio Console → Phone Numbers
   - Set Voice webhook to: `https://your-api-url.onrender.com/twilio/voice`
   - Use HTTP POST

6. **Run Database Migrations**:
   ```bash
   # Use Render Shell or SSH
   cd apps/api
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

## URL Detection Logic

The backend automatically handles URLs:

```typescript
// Priority order:
1. TWILIO_STREAM_URL environment variable (if set)
2. Request headers: x-forwarded-proto + host
3. Fallback: localhost (for local development)
```

This means:
- **On Render**: URLs are automatically detected from Render's proxy headers
- **Local Development**: Falls back to localhost
- **Custom Setup**: Set `TWILIO_STREAM_URL` explicitly

## Testing on Render

1. **Health Check**: Visit `https://your-api-url.onrender.com/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **API Endpoints**: Test via frontend or Postman
   - Register: `POST https://your-api-url.onrender.com/api/auth/register`
   - Login: `POST https://your-api-url.onrender.com/api/auth/login`

3. **Twilio Webhook**: Make a test call
   - The webhook should return TwiML
   - Check Render logs for connection attempts

4. **WebSocket**: Check logs when call connects
   - Should see: "OpenAI Realtime WebSocket connected"
   - Should see: "Using WebSocket URL: wss://..."

## Troubleshooting

### WebSocket Connection Issues
- Verify `TWILIO_STREAM_URL` is set correctly (use `wss://` not `ws://`)
- Check that your Render URL uses HTTPS (required for WSS)
- Review Render logs for connection errors

### CORS Issues
- Ensure `FRONTEND_URL` matches your actual frontend URL exactly
- Check for trailing slashes
- Verify the frontend is calling the correct API URL

### Database Connection
- Verify `DATABASE_URL` is set correctly
- Check database is accessible from Render
- Run migrations if schema is out of sync

### Twilio Webhook Issues
- Verify webhook URL is accessible (test in browser)
- Check TwiML response format
- Review Twilio debugger for webhook errors

## Local Development

For local development, use:
- `apps/api/.env` - Set localhost URLs
- `apps/web/.env.local` - Set `NEXT_PUBLIC_API_URL=http://localhost:3001`

The code automatically detects localhost vs Render environment.
