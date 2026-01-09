# Voice Agent Debugging Guide

## Current Issue: Silence During Calls

If you're experiencing silence when calling, check the logs for these key indicators:

## What to Check in Logs

### 1. Twilio WebSocket Connection
Look for:
```
Twilio stream started: { callSid: "...", streamSid: "..." }
Organization found: <org-id> <org-name>
```

### 2. OpenAI Connection
Look for:
```
Connecting to OpenAI Realtime API...
Connecting to OpenAI Realtime WebSocket: wss://api.openai.com/v1/realtime?model=...
OpenAI Realtime WebSocket connected
OpenAI session created: <session-id>
```

### 3. Session Configuration
Look for:
```
Sending to OpenAI: session.update
OpenAI session updated
```

### 4. Initial Greeting
Look for:
```
Sending initial greeting: Hi, this is...
Sending to OpenAI: response.create
OpenAI response created, expecting audio
```

### 5. Audio Streaming
Look for:
```
Received audio delta from OpenAI, sending to Twilio
Sent message to Twilio: media
```

## Common Issues and Fixes

### Issue: OpenAI WebSocket Not Connecting
**Symptoms:**
- No "OpenAI Realtime WebSocket connected" log
- Error: "Connection timeout" or WebSocket error

**Possible Causes:**
- Invalid `OPENAI_API_KEY` environment variable
- Network/firewall blocking connection
- OpenAI API quota exceeded

**Fix:**
- Verify `OPENAI_API_KEY` is set correctly in Render
- Check OpenAI account status and quota
- Review error logs for specific connection failures

### Issue: No Audio Delta Received
**Symptoms:**
- "OpenAI response created" appears but no "Received audio delta"

**Possible Causes:**
- Session not configured correctly
- Response not generating audio
- Missing or incorrect voice configuration

**Fix:**
- Check that `configureSession` completed successfully
- Verify session configuration includes `modalities: ["audio"]`
- Ensure voice is set correctly (e.g., "alloy", "nova")

### Issue: Audio Not Sent to Twilio
**Symptoms:**
- "Received audio delta" appears but no "Sent message to Twilio"

**Possible Causes:**
- Twilio socket not set correctly
- Socket not in OPEN state
- StreamSid mismatch

**Fix:**
- Verify `setTwilioSocket` was called
- Check socket readyState in logs
- Ensure streamSid matches

### Issue: Organization Not Found
**Symptoms:**
- "Organization not found for call"

**Fix:**
- Ensure at least one organization exists in database
- Register a user account through the web interface first
- This will create an organization automatically

## Next Steps for Debugging

1. **Check Latest Logs**: After the new deployment, make a test call and check Render logs
2. **Look for Errors**: Any red error messages will indicate what's failing
3. **Verify Environment Variables**: Ensure `OPENAI_API_KEY` is set correctly
4. **Check Database**: Ensure you have an organization with agent/business profiles

## Testing Checklist

- [ ] Server is running (check `/health` endpoint)
- [ ] Twilio webhook is configured correctly
- [ ] At least one organization exists in database
- [ ] Organization has AgentProfile and BusinessProfile
- [ ] `OPENAI_API_KEY` is set and valid
- [ ] WebSocket endpoint is accessible (`/call`)

## Expected Log Flow

When a call works correctly, you should see:
1. Twilio webhook called → TwiML returned
2. WebSocket connects → "Twilio stream started"
3. Organization found → "Organization found"
4. OpenAI connects → "OpenAI Realtime WebSocket connected"
5. Session configured → "OpenAI session updated"
6. Greeting triggered → "Sending initial greeting"
7. Audio received → "Received audio delta from OpenAI"
8. Audio sent → "Sent message to Twilio: media"

If any step is missing, that's where the issue is.
