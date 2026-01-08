# Twilio Media Streams Debugging Checklist

If you're getting "OpenAI bridge not initialized" or callSid is undefined, check these items:

## 1. Check the Logs After Next Test Call

After deploying the latest changes, make a test call and look for these log entries in order:

### ✅ Expected Flow:
```
TwilioStreamHandler initialized. Waiting for 'start' event.
Twilio message received: connected
Twilio stream connected.
Twilio message received: start
=== Twilio START Event Debug ===
Full data object: {...}
✅ Organization found: {...}
✅ OPENAI_API_KEY is configured
✅ Agent profile found: {...}
OpenAI bridge created, initializing...
Connecting to OpenAI Realtime API...
✅ OpenAI bridge initialized successfully
```

### ❌ If you see errors:

#### "Missing callSid or streamSid in start event"
- **Problem**: Twilio isn't sending callSid in the start event
- **Check**: Look at the "Full data object" log to see what Twilio actually sent
- **Solution**: The callSid might be in a different field or Twilio version/config issue

#### "Organization not found for call"
- **Problem**: No organization exists in the database
- **Solution**: 
  1. Register a user via the API (POST /api/auth/register)
  2. Or manually create an organization via Prisma Studio
  3. This creates an Organization record that the code needs

#### "OPENAI_API_KEY environment variable is not set"
- **Problem**: OpenAI API key missing in Render environment
- **Solution**: 
  1. Go to Render Dashboard → coordi-api service → Environment
  2. Add `OPENAI_API_KEY` = your OpenAI API key (starts with `sk-`)
  3. Redeploy

#### "Agent profile not found"
- **Problem**: Organization exists but no AgentProfile
- **Solution**: 
  1. The AgentProfile is created automatically when you register
  2. Or create it via API: POST /api/profile/agent
  3. Or use Prisma Studio to create it manually

## 2. Verify Render Environment Variables

Go to Render Dashboard → coordi-api → Environment and verify these are set:

- ✅ `DATABASE_URL` - Auto-populated from database
- ✅ `OPENAI_API_KEY` - Must be set manually (starts with `sk-`)
- ✅ `TWILIO_ACCOUNT_SID` - Your Twilio Account SID (starts with `AC`)
- ✅ `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- ✅ `TWILIO_NUMBER` - Your phone number like `+18444823602` (not the SID!)
- ✅ `JWT_SECRET` - Any random secret string
- ✅ `RENDER_EXTERNAL_URL` - Auto-set by Render (usually correct)

## 3. Verify Database Has Required Data

### Check if Organization exists:
1. Go to Render Dashboard → coordi-api → Shell (or use Prisma Studio)
2. Connect to the database and run:
   ```sql
   SELECT id, name, "twilioNumber" FROM "Organization" LIMIT 5;
   ```

### If no organizations exist:
- Register via API: `POST https://coordi-api.onrender.com/api/auth/register`
- Body: `{ "email": "test@example.com", "password": "test123", "name": "Test Business" }`

### Check if AgentProfile exists:
```sql
SELECT id, "organizationId", voice FROM "AgentProfile";
```

## 4. Verify Twilio Configuration

### In Twilio Console:

1. **Phone Number Configuration**:
   - Go to Phone Numbers → Manage → Active Numbers
   - Click your number
   - Under "Voice & Fax":
     - **A CALL COMES IN** → Webhook: `https://coordi-api.onrender.com/twilio/voice`
     - Method: `HTTP POST`
     - ✅ Save

2. **Verify Webhook is Working**:
   - Make a test call
   - Check Render logs for: `"Incoming call: +17703550978 -> +18444823602"`
   - This confirms Twilio is hitting your webhook

3. **Check WebSocket URL**:
   - The webhook should return TwiML with WebSocket URL: `wss://coordi-api.onrender.com/call`
   - Verify this matches your Render service URL

## 5. Check the Actual Start Event Data

After the next test call, look for this log entry:
```
=== Twilio START Event Debug ===
Full data object: {...}
```

**What to look for:**
- Does `callSid` exist directly in the data object?
- Does `customParameters.CallSid` exist?
- What are all the keys in the data object?
- Is `streamSid` present? (This is required)

## 6. Common Issues and Fixes

### Issue: callSid is undefined
**Possible causes:**
- Twilio version/config doesn't include it in start event
- Custom parameters not being passed correctly
- TwiML format issue

**Check:** Look at "Full data object" log to see actual structure

### Issue: Organization not found
**Fix:** Register a user, which creates an Organization automatically

### Issue: AgentProfile not found  
**Fix:** AgentProfile should be auto-created, but you can create via API:
```bash
POST /api/profile/agent
{
  "voice": "alloy",
  "tone": 50,
  "pace": 50,
  ...
}
```

### Issue: OpenAI API errors
- Verify API key is correct and has credits
- Check OpenAI dashboard for any errors
- Verify the API key has access to Realtime API (it's in beta)

## 7. Test the Complete Flow

1. ✅ Verify environment variables are set in Render
2. ✅ Verify database has Organization and AgentProfile
3. ✅ Verify Twilio webhook points to correct URL
4. ✅ Make a test call
5. ✅ Check Render logs for the debug output
6. ✅ Look for any ❌ error markers in logs
7. ✅ Share the logs if still stuck

## 8. Quick Database Setup (if needed)

If you need to create test data manually:

```sql
-- Create Organization (adjust as needed)
INSERT INTO "Organization" (id, name, "twilioNumber", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Test Business', '+18444823602', NOW(), NOW());

-- Get the org ID, then create AgentProfile
INSERT INTO "AgentProfile" (id, "organizationId", voice, tone, pace, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '<org-id-from-above>',
  'alloy',
  50, 50,
  NOW(), NOW()
);
```

## Next Steps

After checking all the above, make a test call and share the logs. The new diagnostic logging will show exactly where the issue is.
