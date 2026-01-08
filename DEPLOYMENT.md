# Coordi Deployment Guide

## Overview

Coordi is deployed as a monorepo on Render with:
- **API Service**: Fastify backend (Node.js)
- **Web Service**: Next.js frontend
- **Database**: Render Postgres

## Prerequisites

1. Render account
2. GitHub repository with the code
3. OpenAI API key
4. Twilio account with phone number
5. Domain (optional, can use Render default URLs)

## Deployment Steps

### 1. Create Database on Render

1. Go to Render Dashboard → New → PostgreSQL
2. Create database named `coordidb`
3. Note the internal connection string (will be auto-populated in services)

### 2. Deploy API Service

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: `coordi-api`
   - **Root Directory**: `apps/api`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build && npm run prisma:generate`
   - **Start Command**: `npm run start`
4. Set environment variables:
   - `DATABASE_URL` - from the database service (auto-link)
   - `OPENAI_API_KEY` - your OpenAI API key (keep as secret)
   - `TWILIO_ACCOUNT_SID` - your Twilio Account SID (keep as secret)
   - `TWILIO_AUTH_TOKEN` - your Twilio Auth Token (keep as secret)
   - `TWILIO_NUMBER` - your Twilio phone number (e.g., +1234567890)
   - `JWT_SECRET` - a random secret string for JWT signing (keep as secret)
   - `NODE_ENV` - `production`
   - `PORT` - Render sets this automatically (don't override)
   - `FRONTEND_URL` - your frontend URL (e.g., https://coordi-web.onrender.com)
   - `TWILIO_STREAM_URL` - WebSocket URL for media streams (e.g., wss://coordi-api.onrender.com/call)
     - **Note**: If not set, the server will auto-detect from the request URL
5. Deploy

### 3. Run Database Migrations

After the API service is deployed, run migrations:

```bash
# SSH into the Render service or use Render Shell
cd apps/api
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

Alternatively, add this to your build command or create a separate deployment script.

### 4. Deploy Web Service

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: `coordi-web`
   - **Root Directory**: `apps/web`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
4. Set environment variables:
   - `NODE_ENV` - `production`
   - `NEXT_PUBLIC_API_URL` - your API URL (e.g., https://coordi-api.onrender.com)
5. Deploy

### 5. Configure Twilio

1. Go to Twilio Console → Phone Numbers → Manage → Active Numbers
2. Select your phone number
3. Configure Voice webhook:
   - **A Call Comes In**: `https://coordi-api.onrender.com/twilio/voice`
   - HTTP POST
4. Save configuration

### 6. Update API Environment Variables

Update the `TWILIO_STREAM_URL` in the API service to use the correct WebSocket URL:
- `wss://coordi-api.onrender.com/call` (replace with your actual API URL)

Note: Render uses HTTPS by default, so use `wss://` for WebSocket URLs.

## Using render.yaml (Alternative)

You can use the `render.yaml` blueprint file for infrastructure-as-code:

1. Push `render.yaml` to your repository
2. In Render Dashboard, create a new Blueprint
3. Connect your repository
4. Render will create all services automatically
5. Still need to manually set secret environment variables (OPENAI_API_KEY, etc.)

## Custom Domains (Optional)

1. In each Render service, go to Settings → Custom Domains
2. Add your domain (e.g., `api.coordi.com`, `app.coordi.com`)
3. Configure DNS records as instructed by Render
4. Update environment variables:
   - API: `FRONTEND_URL` = `https://app.coordi.com`
   - Web: `NEXT_PUBLIC_API_URL` = `https://api.coordi.com`
   - Twilio webhook: Update to use custom domain

## Testing Deployment

1. Visit your web service URL
2. Register a new account
3. Configure agent and business profiles
4. Test a call to your Twilio number
5. Check logs in Render dashboard for any errors

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correctly set
- Check database is accessible (not paused on free tier)
- Ensure migrations have run

### WebSocket Connection Issues
- Verify `TWILIO_STREAM_URL` uses `wss://` (not `ws://`)
- Check that the `/call` endpoint is accessible
- Review Render logs for WebSocket errors

### Build Failures
- Check Node version (should be 18+)
- Verify all dependencies are in package.json
- Check build logs for specific errors

### CORS Issues
- Verify `FRONTEND_URL` matches your web service URL
- Check CORS configuration in API service

## Monitoring

- Use Render's built-in logs and metrics
- Set up alerts for service downtime
- Monitor API response times
- Track database connection pool usage

## Scaling

- Start with free tier for MVP
- Scale API service vertically (more RAM/CPU) if needed
- Consider horizontal scaling for high call volume (requires sticky sessions for WebSockets)
- Monitor database performance and upgrade if needed


