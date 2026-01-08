# Environment Variables Setup Guide

This guide will help you set up the environment variables needed for Coordi.

## Step 1: Backend API Environment Variables

1. Navigate to the `apps/api` directory
2. Copy the example file:
   ```powershell
   cd apps/api
   copy .env.example .env
   ```
   Or on Mac/Linux:
   ```bash
   cd apps/api
   cp .env.example .env
   ```

3. Open `.env` in a text editor and fill in the values:

### Required Variables:

- **DATABASE_URL**: Your PostgreSQL connection string
  - For local development: `postgresql://username:password@localhost:5432/coordi`
  - You'll need to create a PostgreSQL database first
  - On Windows: Install PostgreSQL or use Docker
  - Or use a cloud service like Render Postgres (free tier available)

- **OPENAI_API_KEY**: Your OpenAI API key
  - Get one at: https://platform.openai.com/api-keys
  - You'll need a paid OpenAI account for GPT-4 Realtime API access

- **TWILIO_ACCOUNT_SID**: Your Twilio Account SID
  - Get from: https://console.twilio.com/
  - Sign up for a free trial account if you don't have one

- **TWILIO_AUTH_TOKEN**: Your Twilio Auth Token
  - Found in the same Twilio Console dashboard

- **TWILIO_NUMBER**: A Twilio phone number
  - Purchase one in Twilio Console → Phone Numbers
  - Format: `+1234567890` (include country code)

- **JWT_SECRET**: A random secret string for JWT token signing
  - Generate a random string (any random text works)
  - Example: `my-super-secret-jwt-key-change-this-in-production`
  - Keep this secret!

### Optional Variables (defaults provided):

- **NODE_ENV**: Set to `development` for local dev
- **PORT**: Backend API port (default: 3001)
- **FRONTEND_URL**: Frontend URL (default: http://localhost:3000)
- **TWILIO_STREAM_URL**: WebSocket URL for media streams (default: wss://localhost:3001/call)

## Step 2: Frontend Environment Variables

1. Navigate to the `apps/web` directory
2. Copy the example file:
   ```powershell
   cd apps/web
   copy .env.local.example .env.local
   ```
   Or on Mac/Linux:
   ```bash
   cd apps/web
   cp .env.local.example .env.local
   ```

3. The `.env.local` file should contain:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

   This tells the frontend where to find the backend API. If your API runs on a different port, update this value.

## Quick Setup for Local Development (Minimum Viable)

If you want to get started quickly and don't have all services set up yet, you can use these minimal values:

### For `apps/api/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/coordi"
OPENAI_API_KEY="sk-placeholder-for-now"
TWILIO_ACCOUNT_SID="AC-placeholder"
TWILIO_AUTH_TOKEN="placeholder"
TWILIO_NUMBER="+1234567890"
JWT_SECRET="dev-secret-key-change-in-production"
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
TWILIO_STREAM_URL="wss://localhost:3001/call"
```

**Note**: The API will start but won't work fully until you have:
- A real database (PostgreSQL)
- Real OpenAI API key
- Real Twilio credentials

## Setting Up PostgreSQL Locally

### Option 1: Install PostgreSQL
1. Download from: https://www.postgresql.org/download/
2. Install and create a database:
   ```sql
   CREATE DATABASE coordi;
   ```

### Option 2: Use Docker
```bash
docker run --name coordi-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=coordi -p 5432:5432 -d postgres
```

Then use: `postgresql://postgres:postgres@localhost:5432/coordi`

### Option 3: Use Render Postgres (Free Tier)
1. Sign up at https://render.com
2. Create a new PostgreSQL database
3. Copy the connection string (internal or external)
4. Use that as your `DATABASE_URL`

## Verifying Your Setup

After creating the `.env` files, you can verify the setup:

1. Check that files exist:
   ```powershell
   # Windows PowerShell
   Test-Path apps/api/.env
   Test-Path apps/web/.env.local
   ```

2. Try starting the API (it will fail if env vars are missing):
   ```bash
   cd apps/api
   npm run dev
   ```

## Next Steps

Once environment variables are set up:

1. **Install dependencies** (from project root):
   ```bash
   npm install
   ```

2. **Set up the database**:
   ```bash
   cd apps/api
   npm run prisma:migrate
   npm run prisma:generate
   ```

3. **Start development servers**:
   ```bash
   npm run dev
   ```

## Security Notes

- **Never commit `.env` or `.env.local` files to Git** (they're already in `.gitignore`)
- **Never share your API keys or secrets**
- **Use different secrets for development and production**
- **Rotate secrets if they're ever exposed**

## Need Help?

- Check the main README.md for more details
- See PROJECT_STATUS.md for what's implemented
- See DEPLOYMENT.md for production setup
