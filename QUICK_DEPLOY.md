# Quick Deploy to Render

## Fastest Method (5 minutes)

1. **Push to GitHub** - Make sure your code is in a GitHub repo

2. **Create Blueprint on Render**:
   - Go to https://dashboard.render.com
   - Click "New +" → "Blueprint"
   - Select your GitHub repo
   - Click "Apply"

3. **Set Secret Environment Variables** (for `coordi-api`):
   ```
   OPENAI_API_KEY = sk-...
   TWILIO_ACCOUNT_SID = AC...
   TWILIO_AUTH_TOKEN = ...
   TWILIO_NUMBER = +1234567890
   JWT_SECRET = (any random string)
   ```

4. **Wait for deployment** - Get your service URLs

5. **Update URLs**:
   - Update `TWILIO_STREAM_URL` in API service with actual URL
   - Update `NEXT_PUBLIC_API_URL` in web service with actual API URL
   - Update `FRONTEND_URL` in API service with actual web URL

6. **Configure Twilio**:
   - Set webhook to: `https://your-api-url.onrender.com/twilio/voice`

7. **Test**: Visit your web URL and make a test call!

---

## Service URLs Format

Your services will have URLs like:
- API: `https://coordi-api-abc123.onrender.com`
- Web: `https://coordi-web-xyz789.onrender.com`

Use these in your environment variables after first deployment.

---

For detailed steps, see `RENDER_DEPLOY_STEPS.md`
