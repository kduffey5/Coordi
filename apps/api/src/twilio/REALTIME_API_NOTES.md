# OpenAI Realtime API Implementation Notes

## Implementation Status

The OpenAI Realtime API is now implemented using a direct WebSocket connection. The implementation:

1. **Connects to OpenAI Realtime API** via WebSocket at `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`
2. **Configures the session** with voice settings, instructions, and tools
3. **Streams audio bidirectionally**:
   - Twilio → OpenAI: Caller's audio sent as PCM16 base64
   - OpenAI → Twilio: AI's audio responses sent back to caller
4. **Handles tool calls** for lead creation, booking, SMS, and escalation
5. **Sends initial greeting** when call connects
6. **Defaults to English** but can detect and respond in other languages

## Key Features

### Language Settings
- **Default Language**: English
- **Language Detection**: Only switches if caller clearly speaks another language first
- **Initial Greeting**: "Hi, this is [Business Name], how can I help you?"

### Audio Format
- **Input**: PCM16, 8kHz (from Twilio)
- **Output**: PCM16, 8kHz (to Twilio)
- **Format Conversion**: Handled automatically by OpenAI

### Session Configuration
- Voice selection from AgentProfile
- System prompt includes business info and personality settings
- Tool schemas registered for function calling
- Turn detection with server-side VAD (Voice Activity Detection)

## Message Flow

1. **Call Starts** → Twilio sends "start" event
2. **OpenAI Connects** → WebSocket connection established
3. **Session Configured** → Voice, prompt, and tools set
4. **Greeting Sent** → AI speaks initial greeting
5. **Audio Streaming**:
   - Caller speaks → Twilio → OpenAI
   - AI responds → OpenAI → Twilio → Caller
6. **Tool Calls** → Handled and results sent back to AI
7. **Call Ends** → Cleanup and transcript saved

## Testing

To test the implementation:

1. Make sure your OpenAI API key is set in `.env`
2. Configure Twilio webhook to point to your server
3. Make a test call to your Twilio number
4. The AI should:
   - Answer immediately
   - Speak in English
   - Start with the greeting
   - Respond naturally to the caller

## Troubleshooting

### Connection Issues
- Verify `OPENAI_API_KEY` is set correctly
- Check that the WebSocket URL is accessible
- Review server logs for connection errors

### Audio Issues
- Ensure audio format matches (PCM16, 8kHz)
- Check that Twilio Media Streams are enabled
- Verify WebSocket connections are stable

### Language Issues
- Check system prompt includes English default instructions
- Verify greeting is sent correctly
- Review transcript logs to see what was said

## Next Steps

The implementation is functional. For production, consider:
- Error recovery and reconnection logic
- Audio quality optimization
- Better interruption handling
- Call recording integration
- Advanced analytics
