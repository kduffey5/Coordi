# OpenAI Realtime API Integration Notes

## Current Status

The OpenAI bridge has the structure in place but uses a placeholder implementation. When you implement the actual OpenAI Realtime API WebSocket connection, use these guidelines:

## Initial Greeting Implementation

When the actual OpenAI Realtime API is connected, the initial greeting should be sent like this:

```typescript
// After session is connected and ready
await this.session.create({
  item: {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "input_text",
        text: "Hi, this is ${businessName}, how can I help you?"
      }
    ]
  }
});
```

This will cause the AI to speak the greeting immediately when the call connects.

## Language Settings

The system prompt now includes explicit instructions to:
- Default to English
- Only switch languages if the caller clearly speaks another language first
- Always start conversations in English

## OpenAI Realtime API Configuration

When implementing the actual connection, make sure to:

1. **Set the model**: Use `gpt-4o-realtime-preview` or the latest Realtime model
2. **Set voice**: Use the voice from AgentProfile (e.g., "alloy", "nova", etc.)
3. **Set instructions**: Include the system prompt with language preferences
4. **Set modalities**: Include both "audio" and "text" for full functionality
5. **Audio format**: Ensure proper format conversion between Twilio's PCM16 and OpenAI's expected format

## Example Connection Code

```typescript
const session = await openai.beta.realtime.connect({
  model: "gpt-4o-realtime-preview-2024-12-17",
  voice: agentProfile.voice || "alloy",
  instructions: systemPrompt, // Includes English default instruction
  temperature: 0.8,
  modalities: ["audio", "text"],
  input_audio_format: "pcm16",
  output_audio_format: "pcm16",
});
```

## Language Detection

The system prompt includes instructions to detect language from the caller's speech and respond accordingly, but always starting in English. The AI model will automatically detect if the caller is speaking Spanish or another language and can switch, but will default to English initially.
