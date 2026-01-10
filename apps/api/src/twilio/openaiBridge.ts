import OpenAI from "openai";
import { prisma } from "../config/database.js";
import type { CallSession } from "./types.js";
import { TOOL_SCHEMAS } from "../tools/index.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export class OpenAIBridge {
  private session: any = null; // OpenAI Realtime session
  private callSession: CallSession;
  private organizationId: string;
  private onToolCall?: (toolCall: ToolCall) => Promise<any>;
  private businessName: string = "";
  private customWelcomePrompt: string = "";
  private twilioSocket: any = null; // Reference to Twilio WebSocket for sending audio back
  private isInitialized: boolean = false;
  private _greetingSent: boolean = false; // Track if greeting was sent

  constructor(callSession: CallSession, organizationId: string) {
    this.callSession = callSession;
    this.organizationId = organizationId;
  }

  setTwilioSocket(socket: any) {
    this.twilioSocket = socket;
  }

  async initialize() {
    console.log("OpenAIBridge.initialize() called for org:", this.organizationId);
    
    // Check API key first
    if (!process.env.OPENAI_API_KEY) {
      const error = "OPENAI_API_KEY environment variable is not set";
      console.error("❌", error);
      throw new Error(error);
    }
    
    // Get agent profile for system prompt
    console.log("Fetching agent profile for organization:", this.organizationId);
    const agentProfile = await prisma.agentProfile.findUnique({
      where: { organizationId: this.organizationId },
      include: {
        organization: {
          include: {
            businessProfile: true,
          },
        },
      },
    });

    if (!agentProfile) {
      const error = `Agent profile not found for organization: ${this.organizationId}. You may need to create an agent profile first.`;
      console.error("❌", error);
      throw new Error(error);
    }
    
    console.log("✅ Agent profile found:", { 
      id: agentProfile.id, 
      voice: agentProfile.voice,
      orgName: agentProfile.organization.name 
    });

    // Build system prompt from agent and business profile
    const systemPrompt = this.buildSystemPrompt(agentProfile);

    try {
      console.log("Connecting to OpenAI Realtime API...");
      
      // OpenAI Realtime API uses direct WebSocket connection
      // Connect to the Realtime API WebSocket endpoint
      const WebSocketModule = await import("ws");
      const WebSocket = WebSocketModule.default;
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;
      
      console.log("Connecting to OpenAI Realtime WebSocket:", wsUrl);

      // Create WebSocket connection to OpenAI
      const ws = new WebSocket(wsUrl, {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1",
        },
      });

      this.session = {
        ws,
        id: `session_${Date.now()}`,
        state: "connecting",
      };

      // Set up WebSocket event handlers
      ws.on("open", async () => {
        console.log("OpenAI Realtime WebSocket connected");
        this.session.state = "connected";
        
      // Configure the session once connected
      await this.configureSession(agentProfile, systemPrompt);
      
      this.isInitialized = true;
      
      // Wait for session.updated confirmation before sending greeting
      // The greeting will be sent after session.updated event is received
      });

      ws.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          console.log("OpenAI message received:", message.type);
          // Log important events with more detail
          if (message.type === "session.updated" || message.type === "response.created" || message.type === "response.audio.delta") {
            console.log("OpenAI event details:", JSON.stringify(message, null, 2).substring(0, 500));
          }
          this.handleOpenAIMessage(message);
        } catch (error) {
          console.error("Error parsing OpenAI message:", error);
        }
      });

      ws.on("error", (error: Error) => {
        console.error("OpenAI WebSocket error:", error);
      });

      ws.on("close", () => {
        console.log("OpenAI Realtime WebSocket closed");
        if (this.session) {
          this.session.state = "closed";
        }
      });

      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 10000);

        const openHandler = () => {
          clearTimeout(timeout);
          ws.off("open", openHandler);
          ws.off("error", errorHandler);
          resolve();
        };

        const errorHandler = (error: Error) => {
          clearTimeout(timeout);
          ws.off("open", openHandler);
          ws.off("error", errorHandler);
          reject(error);
        };

        ws.on("open", openHandler);
        ws.on("error", errorHandler);
      });

      return this.session;
    } catch (error: any) {
      console.error("Error initializing OpenAI Realtime:", error);
      // Fallback: log the error but don't crash
      console.log("Falling back to placeholder implementation for now");
      this.session = {
        state: "error",
        id: `session_${Date.now()}`,
      };
      this.isInitialized = true;
      return this.session;
    }
  }

  private handleOpenAIMessage(message: any) {
    // Handle different message types from OpenAI Realtime API
    switch (message.type) {
      case "response.created":
        console.log("OpenAI response created");
        break;

      case "response.done":
        console.log("OpenAI response completed");
        break;

      case "response.audio.delta":
        // Audio output from AI - send to Twilio
        if (message.delta && this.twilioSocket && this.callSession) {
          console.log("✅ Received audio delta from OpenAI (length:", message.delta?.length, "), sending to Twilio");
          this.sendAudioToTwilio(message.delta);
        } else {
          console.warn("❌ Audio delta received but missing required components:", {
            hasDelta: !!message.delta,
            deltaLength: message.delta?.length,
            hasTwilioSocket: !!this.twilioSocket,
            twilioSocketReady: this.twilioSocket?.readyState,
            hasCallSession: !!this.callSession,
          });
        }
        break;

      case "response.audio_transcript.delta":
        // Partial transcript of AI speech
        break;

      case "response.audio_transcript.done":
        // Complete transcript of AI speech
        if (message.transcript) {
          this.callSession.transcript.push(`AI: ${message.transcript}`);
        }
        break;

      case "input_audio_buffer.speech_started":
        console.log("Caller started speaking");
        break;

      case "input_audio_buffer.speech_stopped":
        console.log("Caller stopped speaking");
        break;

      case "conversation.item.input_audio_transcription.completed":
        // Transcript of what caller said
        if (message.transcript) {
          this.callSession.transcript.push(`Caller: ${message.transcript}`);
        }
        break;

      case "session.updated":
        console.log("OpenAI session updated - session is ready");
        // Session configuration confirmed - now send initial greeting
        // Small delay to ensure session is fully ready
        setTimeout(() => {
          this.sendInitialGreeting();
        }, 500);
        break;

      case "session.created":
        console.log("OpenAI session created:", message.session?.id);
        if (message.session?.id) {
          this.callSession.openAISessionId = message.session.id;
        }
        // Also try sending greeting after session.created as fallback
        // (in case session.updated doesn't fire)
        setTimeout(() => {
          if (!this._greetingSent) {
            console.log("Sending greeting after session.created (fallback)");
            this.sendInitialGreeting();
          }
        }, 2000);
        break;

      case "response.function_call_arguments.done":
        // Tool/function call from AI
        this.handleToolCall(message);
        break;

      case "error":
        console.error("OpenAI Realtime error:", message.error);
        break;
    }
  }

  private async handleToolCall(message: any) {
    if (!this.onToolCall) return;

    const functionCall = message.function_call;
    if (!functionCall) return;

    try {
      const toolCall: ToolCall = {
        id: functionCall.id,
        name: functionCall.name,
        arguments: JSON.parse(functionCall.arguments || "{}"),
      };

      console.log("Tool call received:", toolCall.name, toolCall.arguments);

      // Execute the tool
      const result = await this.onToolCall(toolCall);

      // Send tool result back to OpenAI
      this.sendToOpenAI({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCall.id,
          output: JSON.stringify(result),
        },
      });
    } catch (error: any) {
      console.error("Tool call error:", error);
      // Send error back to OpenAI
      this.sendToOpenAI({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCall.id,
          output: JSON.stringify({ error: error.message || "Tool execution failed" }),
        },
      });
    }
  }

  private sendToOpenAI(message: any) {
    if (this.session?.ws && this.session.ws.readyState === 1) {
      const messageStr = JSON.stringify(message);
      console.log("Sending to OpenAI:", message.type, messageStr.substring(0, 200));
      this.session.ws.send(messageStr);
    } else {
      console.warn("Cannot send to OpenAI - session not ready:", {
        hasSession: !!this.session,
        hasWs: !!this.session?.ws,
        readyState: this.session?.ws?.readyState,
      });
    }
  }

  private sendAudioToTwilio(audioBase64: string) {
    if (!this.twilioSocket || !this.callSession) {
      console.warn("Cannot send audio to Twilio - missing socket or session");
      return;
    }

    try {
      // OpenAI sends PCM16 audio at 24kHz (base64 encoded)
      // Twilio expects MuLaw audio at 8kHz (base64 encoded)
      // We need to: resample 24kHz → 8kHz, then convert PCM16 → MuLaw
      
      // Decode base64 PCM16 audio (24kHz)
      const pcm16Buffer24k = Buffer.from(audioBase64, "base64");
      
      // Resample from 24kHz to 8kHz
      const pcm16Buffer8k = this.resample24kTo8k(pcm16Buffer24k);
      
      // Convert PCM16 to MuLaw
      const mulawBuffer = this.pcm16ToMulaw(pcm16Buffer8k);
      
      // Encode MuLaw to base64 for Twilio
      const mulawBase64 = mulawBuffer.toString("base64");
      
      const twilioMessage = {
        event: "media",
        streamSid: this.callSession.streamSid,
        media: {
          payload: mulawBase64,
        },
      };

      if (this.twilioSocket.readyState === 1) {
        this.twilioSocket.send(JSON.stringify(twilioMessage));
        // Log first few audio chunks to verify they're being sent
        if (!this._audioChunkCount) this._audioChunkCount = 0;
        this._audioChunkCount++;
        if (this._audioChunkCount <= 3) {
          console.log(`📤 Sent audio chunk #${this._audioChunkCount} to Twilio (PCM16 24kHz: ${pcm16Buffer24k.length} bytes, PCM16 8kHz: ${pcm16Buffer8k.length} bytes, MuLaw: ${mulawBuffer.length} bytes)`);
        }
      } else {
        console.warn("Twilio socket not ready, state:", this.twilioSocket.readyState);
      }
    } catch (error) {
      console.error("Error sending audio to Twilio:", error);
    }
  }
  
  private _audioChunkCount: number = 0;
  private _inputAudioChunkCount: number = 0;

  private buildSystemPrompt(profile: any): string {
    const org = profile.organization;
    const business = org.businessProfile;
    const businessName = business?.companyName || org.name;

    let prompt = `You are Coordi, an AI receptionist for ${businessName}, a service business.

CRITICAL LANGUAGE INSTRUCTIONS:
- You MUST speak in English by default
- Only switch to another language if the caller clearly speaks to you in that language first
- If you detect the caller is speaking Spanish (or another language), you may respond in that language, but always start in English
- Default to English unless explicitly requested otherwise

Your speaking style:
- Tone: ${this.scaleToWord(profile.tone, ["casual", "professional", "formal"])}
- Pace: ${this.scaleToWord(profile.pace, ["slow and clear", "normal", "quick"])}
- Energy: ${this.scaleToWord(profile.energy, ["calm", "moderate", "enthusiastic"])}
- Empathy: ${this.scaleToWord(profile.empathyLevel, ["matter-of-fact", "understanding", "very empathetic"])}

Company Information:
${business?.description ? `Description: ${business.description}\n` : ""}
${business?.servicesOffered ? `Services: ${business.servicesOffered}\n` : ""}
${business?.serviceAreas ? `Service Areas: ${business.serviceAreas}\n` : ""}
${business?.pricingInfo ? `Pricing: ${business.pricingInfo}\n` : ""}

Your job is to:
1. Answer calls professionally and pleasantly IN ENGLISH
2. Start every call with a greeting like: "Hi, this is ${businessName}, how can I help you?"
3. Gather caller information (name, phone, address, service needs)
4. Use tools to create leads, book appointments, or send SMS
5. Be helpful and never sound like a robot
6. If you don't know something, politely say you'll have someone follow up

Available tools:
- create_lead: Use when you have the caller's name and contact info
- book_estimate: Use when caller wants to schedule an appointment
- send_sms: Use to send follow-up text messages
- escalate_to_human: Use if caller specifically requests to talk to a person

Always be natural, friendly, and conversational. Speak in English unless the caller clearly requests otherwise.`;

    // Store business name for initial greeting
    this.businessName = businessName;
    this.customWelcomePrompt = profile.welcomePrompt;

    return prompt;
  }

  private scaleToWord(value: number, words: string[]): string {
    const index = Math.floor((value / 100) * (words.length - 1));
    return words[Math.min(index, words.length - 1)];
  }

  private async configureSession(agentProfile: any, systemPrompt: string) {
    if (!this.session?.ws || this.session.ws.readyState !== 1) {
      console.warn("Cannot configure session - WebSocket not ready");
      return;
    }

    try {
      console.log("Configuring OpenAI session...");
      
      // Send session update to configure the session
      this.sendToOpenAI({
        type: "session.update",
        session: {
          modalities: ["audio", "text"],
          instructions: systemPrompt,
          voice: agentProfile.voice || "alloy",
          temperature: 0.8,
          // Twilio sends audio/x-mulaw (G.711 μ-law) at 8kHz
          // OpenAI Realtime API outputs pcm16 at 24kHz (default)
          // We'll resample from 24kHz to 8kHz before converting to MuLaw
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          tools: TOOL_SCHEMAS as any,
        },
      });
      
      console.log("Session configuration sent, waiting for confirmation...");
    } catch (error) {
      console.error("Error configuring session:", error);
    }
  }

  onToolCallCallback(callback: (toolCall: ToolCall) => Promise<any>) {
    this.onToolCall = callback;
  }

  private async sendInitialGreeting() {
    if (!this.session?.ws || this.session.ws.readyState !== 1) {
      console.warn("Session not ready for greeting");
      return;
    }

    // Generate initial greeting message
    const greeting = this.customWelcomePrompt 
      ? this.customWelcomePrompt
      : `Hi, this is ${this.businessName}, how can I help you?`;
    
      console.log(`Sending initial greeting: ${greeting}`);
      
      if (this._greetingSent) {
        console.log("Greeting already sent, skipping");
        return;
      }
      
      try {
        // To trigger the AI to speak the initial greeting:
        // 1. Add a conversation item with input text (simple trigger)
        // 2. Create a response - AI will respond based on system prompt which instructs greeting
        
        // Add conversation item first (simulates user saying something)
        this.sendToOpenAI({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Hello",
              },
            ],
          },
        });
        
        // Small delay to ensure conversation item is processed
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Now create a response - AI should respond with greeting from system prompt
        // Must use ['audio', 'text'] - OpenAI doesn't support ['audio'] alone
        this.sendToOpenAI({
          type: "response.create",
          response: {
            modalities: ["audio", "text"],
          },
        });

        this._greetingSent = true;
        console.log("✅ Initial greeting response triggered (AI will use system prompt to generate greeting)");
        this.callSession.transcript.push(`AI: ${greeting}`);
      } catch (error) {
        console.error("Error sending initial greeting:", error);
      }
  }

  /**
   * Convert MuLaw (G.711 μ-law) audio to PCM16
   * MuLaw is 8-bit encoded, PCM16 is 16-bit signed integers
   */
  private mulawToPcm16(mulawBuffer: Buffer): Buffer {
    const pcm16Buffer = Buffer.allocUnsafe(mulawBuffer.length * 2);
    
    // Standard G.711 μ-law to PCM16 conversion algorithm
    // Reference: ITU-T G.711 specification
    const BIAS = 33; // Standard G.711 bias value
    
    for (let i = 0; i < mulawBuffer.length; i++) {
      // Step 1: Invert all bits (μ-law encoding uses bit inversion)
      let mulaw = mulawBuffer[i] ^ 0xFF;
      
      // Step 2: Extract sign bit (bit 7: 0 = positive, 1 = negative)
      const sign = (mulaw & 0x80) ? -1 : 1;
      
      // Step 3: Extract segment (exponent, bits 6-4)
      const segment = (mulaw & 0x70) >> 4;
      
      // Step 4: Extract quantization level (mantissa, bits 3-0)
      const quantization = mulaw & 0x0F;
      
      // Step 5: Calculate sample using standard G.711 formula:
      // sample = ((quantization * 2 + 33) << segment) - 33
      let sample = ((quantization << 1) + BIAS) << segment;
      sample -= BIAS;
      
      // Step 6: Apply sign
      sample *= sign;
      
      // Step 7: Clamp to 16-bit signed integer range
      sample = Math.max(-32768, Math.min(32767, sample));
      
      // Write as little-endian 16-bit signed integer
      pcm16Buffer.writeInt16LE(sample, i * 2);
    }
    
    return pcm16Buffer;
  }

  /**
   * Resample PCM16 audio from 24kHz to 8kHz (3:1 downsampling)
   * Uses simple linear interpolation for downsampling
   */
  private resample24kTo8k(pcm16Buffer: Buffer): Buffer {
    // 24kHz to 8kHz is 3:1 ratio
    const sourceRate = 24000;
    const targetRate = 8000;
    const ratio = sourceRate / targetRate; // 3.0
    
    // Each sample is 2 bytes (16-bit)
    const sourceSamples = pcm16Buffer.length / 2;
    const targetSamples = Math.floor(sourceSamples / ratio);
    const targetBuffer = Buffer.allocUnsafe(targetSamples * 2);
    
    // Simple linear interpolation downsampling
    for (let i = 0; i < targetSamples; i++) {
      const sourceIndex = i * ratio;
      const sourceIdx1 = Math.floor(sourceIndex);
      const sourceIdx2 = Math.min(Math.ceil(sourceIndex), sourceSamples - 1);
      const t = sourceIndex - sourceIdx1;
      
      // Read source samples
      const sample1 = pcm16Buffer.readInt16LE(sourceIdx1 * 2);
      const sample2 = pcm16Buffer.readInt16LE(sourceIdx2 * 2);
      
      // Linear interpolation
      const interpolated = Math.round(sample1 * (1 - t) + sample2 * t);
      
      // Clamp to 16-bit range
      const clamped = Math.max(-32768, Math.min(32767, interpolated));
      
      // Write to target buffer
      targetBuffer.writeInt16LE(clamped, i * 2);
    }
    
    return targetBuffer;
  }

  /**
   * Convert PCM16 audio to MuLaw (G.711 μ-law)
   * PCM16 is 16-bit signed integers, MuLaw is 8-bit encoded
   * Standard ITU-T G.711 μ-law encoding algorithm
   */
  private pcm16ToMulaw(pcm16Buffer: Buffer): Buffer {
    const mulawBuffer = Buffer.allocUnsafe(pcm16Buffer.length / 2);
    
    // Standard G.711 μ-law encoding constants
    const BIAS = 0x84; // 132 decimal
    const MAX = 32635; // Maximum value for μ-law encoding
    
    for (let i = 0; i < mulawBuffer.length; i++) {
      // Read 16-bit signed integer (little-endian, as OpenAI sends)
      let sample = pcm16Buffer.readInt16LE(i * 2);
      
      // Get sign bit (bit 15)
      const sign = (sample >>> 15) & 0x01;
      
      // Get magnitude (absolute value)
      let magnitude = Math.abs(sample);
      
      // Clamp to valid range
      magnitude = Math.min(magnitude, MAX);
      
      // Add bias
      magnitude += BIAS;
      
      // Find exponent (segment) using logarithm-like operation
      // The segments are: 0-31, 32-95, 96-223, 224-479, 480-991, 992-2015, 2016-4063, 4064-8159
      // But we use a simpler approach: find the highest set bit position
      let exponent = 7;
      if (magnitude < 0x1F) exponent = 0;
      else if (magnitude < 0x3F) exponent = 1;
      else if (magnitude < 0x7F) exponent = 2;
      else if (magnitude < 0xFF) exponent = 3;
      else if (magnitude < 0x1FF) exponent = 4;
      else if (magnitude < 0x3FF) exponent = 5;
      else if (magnitude < 0x7FF) exponent = 6;
      // else exponent = 7 (already set)
      
      // Calculate mantissa (4-bit quantization)
      // Shift right by (exponent + 3) and mask to 4 bits
      const mantissa = (magnitude >> (exponent + 3)) & 0x0F;
      
      // Combine: sign (bit 7) | exponent (bits 6-4) | mantissa (bits 3-0)
      let mulaw = (sign << 7) | (exponent << 4) | mantissa;
      
      // Invert all bits (μ-law encoding requires bit inversion)
      mulaw ^= 0xFF;
      
      mulawBuffer[i] = mulaw;
    }
    
    return mulawBuffer;
  }

  async sendAudio(audioData: Buffer) {
    if (!this.session?.ws || this.session.ws.readyState !== 1 || !this.isInitialized) {
      return;
    }

    try {
      // Convert MuLaw (from Twilio) to PCM16 (required by OpenAI)
      // Twilio sends audio/x-mulaw at 8kHz, OpenAI expects pcm16 at 8kHz
      const pcm16Audio = this.mulawToPcm16(audioData);
      
      // Debug: Check if audio is non-zero (not silence)
      const sampleCount = pcm16Audio.length / 2; // Each sample is 2 bytes
      let nonZeroSamples = 0;
      let maxAmplitude = 0;
      for (let i = 0; i < sampleCount; i++) {
        const sample = pcm16Audio.readInt16LE(i * 2);
        if (sample !== 0) nonZeroSamples++;
        maxAmplitude = Math.max(maxAmplitude, Math.abs(sample));
      }
      
      // Log audio statistics for first few chunks to verify conversion
      if (!this._inputAudioChunkCount) this._inputAudioChunkCount = 0;
      this._inputAudioChunkCount++;
      if (this._inputAudioChunkCount <= 5) {
        console.log(`📥 Input audio chunk #${this._inputAudioChunkCount}: MuLaw ${audioData.length} bytes → PCM16 ${pcm16Audio.length} bytes, ${nonZeroSamples}/${sampleCount} non-zero samples, max amplitude: ${maxAmplitude}`);
        // Log first few MuLaw bytes to see if they're all the same
        const firstBytes = Array.from(audioData.slice(0, Math.min(10, audioData.length))).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ');
        console.log(`   First MuLaw bytes: ${firstBytes}`);
      }
      
      // Convert PCM16 buffer to base64
      const base64Audio = pcm16Audio.toString("base64");
      
      // Send audio to OpenAI Realtime API
      // Now the audio is in PCM16 format at 8kHz as expected by OpenAI
      this.sendToOpenAI({
        type: "input_audio_buffer.append",
        audio: base64Audio,
      });
    } catch (error) {
      console.error("Error sending audio to OpenAI:", error);
    }
  }

  async close() {
    if (this.session?.ws) {
      try {
        // Send session end message
        this.sendToOpenAI({
          type: "session.update",
          session: {
            modalities: [],
            instructions: "",
          },
        });

        // Close WebSocket
        this.session.ws.close();
        this.session = null;
      } catch (error) {
        console.error("Error closing OpenAI session:", error);
      }
    }
  }

  getSessionId(): string | undefined {
    return this.callSession.openAISessionId;
  }
}
