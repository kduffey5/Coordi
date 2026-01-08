# Step-by-Step Render Deployment Guide

This guide will walk you through deploying Coordi to Render step by step.

## Prerequisites Checklist

Before starting, make sure you have:
- [ ] GitHub account
- [ ] Render account (sign up at https://render.com)
- [ ] Your code pushed to a GitHub repository
- [ ] OpenAI API key
- [ ] Twilio account with Account SID, Auth Token, and phone number
- [ ] A secure random string for JWT_SECRET (you can generate one online)

## Method 1: Using Blueprint (Recommended - Easiest)

### Step 1: Push Code to GitHub

1. Make sure all your code is committed and pushed to GitHub
2. Your repository should include the `render.yaml` file in the root

### Step 2: Create Blueprint on Render

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** in the top right
3. Select **"Blueprint"**
4. Connect your GitHub account if not already connected
5. Select your repository (the one with Coordi code)
6. Click **"Apply"**

Render will automatically:
- Create the database (`coordidb`)
- Create the API service (`coordi-api`)
- Create the web service (`coordi-web`)
- Link the database to the API service

### Step 3: Set Environment Variables

After the blueprint creates the services, you need to set the secret environment variables manually:

#### For `coordi-api` Service:

1. Go to your **Dashboard** → Click on **`coordi-api`** service
2. Go to **Environment** tab
3. Add these environment variables (click "Add Environment Variable"):

```
OPENAI_API_KEY = sk-...your-openai-api-key
TWILIO_ACCOUNT_SID = AC...your-account-sid
TWILIO_AUTH_TOKEN = your-auth-token
TWILIO_NUMBER = +1234567890  (your Twilio phone number with country code)
JWT_SECRET = your-random-secret-string-here
```

**Important Notes:**
- Mark sensitive values (OPENAI_API_KEY, TWILIO_AUTH_TOKEN, JWT_SECRET) as "Secret"
- The `DATABASE_URL` should already be set automatically from the database
- The `FRONTEND_URL` and `TWILIO_STREAM_URL` are already set in render.yaml
- **DO NOT** set `PORT` - Render sets this automatically

4. Click **"Save Changes"**

#### For `coordi-web` Service:

1. Go to **`coordi-web`** service
2. Go to **Environment** tab
3. Verify these are set (should be auto-set from render.yaml):
   - `NODE_ENV` = `production`
   - `NEXT_PUBLIC_API_URL` = `https://coordi-api.onrender.com`

4. **IMPORTANT**: Update `NEXT_PUBLIC_API_URL` with your actual API service URL
   - You'll see the actual URL after the first deployment
   - Format: `https://coordi-api-XXXX.onrender.com` (where XXXX is random)
   - Update it to match your actual API URL

### Step 4: Update URLs in API Service

After the first deployment, you'll get actual service URLs. Update environment variables:

1. Go to **`coordi-api`** service → **Settings**
2. Note your service URL (e.g., `https://coordi-api-abc123.onrender.com`)
3. Go to **Environment** tab
4. Update these variables:
   - `TWILIO_STREAM_URL` = `wss://coordi-api-abc123.onrender.com/call` (replace with your actual URL)
   - `FRONTEND_URL` = `https://coordi-web-xyz789.onrender.com` (replace with your actual web URL)

5. Go to **`coordi-web`** service → **Environment**
6. Update:
   - `NEXT_PUBLIC_API_URL` = `https://coordi-api-abc123.onrender.com` (your actual API URL)

### Step 5: Run Database Migrations

1. Go to **`coordi-api`** service
2. Click on **"Shell"** tab (or "SSH" if available)
3. Run these commands:
   ```bash
   cd apps/api
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

   Or add to build command (see Alternative below)

4. Wait for migrations to complete

### Step 6: Verify Deployment

1. Check **`coordi-api`** logs - should see "Server listening on..."
2. Check **`coordi-web`** logs - should see "Ready" message
3. Visit your web service URL
4. Visit `https://your-api-url.onrender.com/health` - should return `{"status":"ok"}`

### Step 7: Configure Twilio

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click on your phone number
4. Under **Voice & Fax**, find **"A Call Comes In"**
5. Set it to:
   - **Webhook URL**: `https://coordi-api-abc123.onrender.com/twilio/voice`
   - **HTTP Method**: POST
6. Click **Save**

### Step 8: Test Everything

1. Visit your web service URL
2. Register a new account
3. Configure agent and business profiles
4. Make a test call to your Twilio number
5. Check logs for any errors

---

## Method 2: Manual Deployment (Step by Step)

If you prefer to create services manually or the Blueprint doesn't work:

### Step 1: Create Database

1. Go to Render Dashboard → **New +** → **PostgreSQL**
2. Configure:
   - **Name**: `coordidb`
   - **Database**: `coordi`
   - **User**: `coordi`
   - **Plan**: Free (or paid)
3. Click **Create Database**
4. Note the **Internal Connection String** (you'll need it later)

### Step 2: Create API Service

1. Go to **New +** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `coordi-api`
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `apps/api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build && npm run prisma:generate`
   - **Start Command**: `npm run start`
4. Click **Advanced** and set:
   - **Node Version**: `18` or `20`
5. Click **Create Web Service**

### Step 3: Configure API Environment Variables

1. In the API service, go to **Environment** tab
2. Click **"Add Environment Variable"** and add:

```
NODE_ENV = production
DATABASE_URL = (select from dropdown: coordidb → connectionString)
OPENAI_API_KEY = sk-... (mark as secret)
TWILIO_ACCOUNT_SID = AC... (mark as secret)
TWILIO_AUTH_TOKEN = ... (mark as secret)
TWILIO_NUMBER = +1234567890
JWT_SECRET = your-random-secret (mark as secret)
FRONTEND_URL = https://coordi-web.onrender.com (update after web is deployed)
TWILIO_STREAM_URL = wss://coordi-api.onrender.com/call (update with actual URL)
```

3. Save changes
4. Wait for first deployment to get your actual URL
5. Update `TWILIO_STREAM_URL` and `FRONTEND_URL` with actual URLs

### Step 4: Create Web Service

1. Go to **New +** → **Web Service**
2. Connect your GitHub repository (same one)
3. Configure:
   - **Name**: `coordi-web`
   - **Region**: Same as API
   - **Branch**: `main`
   - **Root Directory**: `apps/web`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
4. Click **Create Web Service**

### Step 5: Configure Web Environment Variables

1. In the web service, go to **Environment** tab
2. Add:
   ```
   NODE_ENV = production
   NEXT_PUBLIC_API_URL = https://coordi-api-abc123.onrender.com (your actual API URL)
   ```
3. Save changes

### Step 6-8: Follow Steps 5-8 from Method 1

(Apply migrations, verify, configure Twilio, test)

---

## Alternative: Add Migrations to Build Command

Instead of running migrations manually, you can add them to the build command:

1. Go to **`coordi-api`** service → **Settings**
2. Update **Build Command** to:
   ```
   npm install && npm run build && npm run prisma:generate && npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

This will run migrations automatically on each deployment.

---

## Troubleshooting Common Issues

### Issue: Build Fails with "Module not found"

**Solution:**
- Make sure `rootDir` is set to `apps/api` or `apps/web`
- Check that all dependencies are in `package.json`
- Try clearing build cache in Render settings

### Issue: Database Connection Error

**Solution:**
- Verify `DATABASE_URL` is set correctly
- Check database is not paused (free tier pauses after inactivity)
- Make sure migrations have run

### Issue: CORS Errors in Browser

**Solution:**
- Verify `FRONTEND_URL` in API service matches your web service URL exactly
- Check for trailing slashes (should not have one)
- Ensure web service `NEXT_PUBLIC_API_URL` matches API service URL

### Issue: WebSocket Connection Fails

**Solution:**
- Verify `TWILIO_STREAM_URL` uses `wss://` not `ws://`
- Check the URL is correct (no typos)
- Ensure API service is deployed and running
- Check Render logs for WebSocket errors

### Issue: Prisma Client Not Generated

**Solution:**
- Make sure `prisma:generate` is in the build command
- Check that `prisma/schema.prisma` exists in `apps/api/prisma/`
- Verify build logs show Prisma generation step

### Issue: Port Already in Use

**Solution:**
- Don't set `PORT` environment variable - Render sets this automatically
- Remove any hardcoded port numbers from your code

---

## Post-Deployment Checklist

- [ ] API service is running (check logs)
- [ ] Web service is running (check logs)
- [ ] Health endpoint works: `/health`
- [ ] Can register/login on web interface
- [ ] Database migrations ran successfully
- [ ] Twilio webhook is configured
- [ ] Test call works (calls are answered)
- [ ] Environment variables are all set correctly
- [ ] No errors in logs

---

## Getting Help

If you run into issues:
1. Check the **Logs** tab in each Render service
2. Check the build logs for errors
3. Verify all environment variables are set
4. Ensure database is not paused
5. Review the troubleshooting section above

---

## Next Steps After Deployment

1. **Set up monitoring**: Use Render's built-in metrics
2. **Add custom domain** (optional): In service settings
3. **Enable SSL**: Automatic with Render (HTTPS by default)
4. **Set up alerts**: In Render dashboard for service downtime
5. **Optimize performance**: Monitor and scale as needed

Good luck with your deployment! 🚀
