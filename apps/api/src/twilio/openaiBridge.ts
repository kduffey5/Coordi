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
  public isInitialized: boolean = false;
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
      let pcm16Buffer8k = this.resample24kTo8k(pcm16Buffer24k);
      
      // Apply audio enhancement for crystal clear quality
      pcm16Buffer8k = this.enhanceAudioQuality(pcm16Buffer8k);
      
      // Remove DC offset to reduce static and improve audio quality
      pcm16Buffer8k = this.removeDCOffset(pcm16Buffer8k);
      
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
            threshold: 0.6, // Increased from 0.5 - requires more confidence before detecting speech
            prefix_padding_ms: 300,
            silence_duration_ms: 1200, // Increased from 500ms - wait longer (1.2 seconds) before responding
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
   * Uses weighted averaging with anti-aliasing for crystal clear audio
   */
  private resample24kTo8k(pcm16Buffer: Buffer): Buffer {
    // 24kHz to 8kHz is 3:1 ratio - integer ratio
    const ratio = 3; // 3 samples become 1
    
    // Each sample is 2 bytes (16-bit)
    const sourceSamples = pcm16Buffer.length / 2;
    const targetSamples = Math.floor(sourceSamples / ratio);
    const targetBuffer = Buffer.allocUnsafe(targetSamples * 2);
    
    // Use weighted averaging with a simple low-pass filter to reduce aliasing
    // This provides better quality than simple averaging
    for (let i = 0; i < targetSamples; i++) {
      const sourceStart = i * ratio;
      
      // Use weighted average with more weight on center sample (reduces aliasing)
      // Weights: [0.25, 0.5, 0.25] for better frequency response
      let sum = 0;
      let weightSum = 0;
      
      for (let j = 0; j < ratio && (sourceStart + j) < sourceSamples; j++) {
        const weight = j === 1 ? 0.5 : 0.25; // Center sample gets more weight
        const sample = pcm16Buffer.readInt16LE((sourceStart + j) * 2);
        sum += sample * weight;
        weightSum += weight;
      }
      
      const average = Math.round(sum / weightSum);
      
      // Clamp to 16-bit range
      const clamped = Math.max(-32768, Math.min(32767, average));
      
      // Write to target buffer
      targetBuffer.writeInt16LE(clamped, i * 2);
    }
    
    return targetBuffer;
  }

  /**
   * Resample PCM16 audio from 8kHz to 24kHz (1:3 upsampling)
   * Uses cubic interpolation for smoother, clearer audio
   */
  private resample8kTo24k(pcm16Buffer: Buffer): Buffer {
    // 8kHz to 24kHz is 1:3 ratio - integer ratio, so we can optimize
    const ratio = 3; // 1 sample becomes 3
    
    // Each sample is 2 bytes (16-bit)
    const sourceSamples = pcm16Buffer.length / 2;
    const targetSamples = sourceSamples * ratio;
    const targetBuffer = Buffer.allocUnsafe(targetSamples * 2);
    
    // For each source sample, create 3 output samples using cubic interpolation
    for (let i = 0; i < sourceSamples; i++) {
      const sourceIdx = i * 2;
      const targetIdx = i * ratio * 2;
      
      // Get surrounding samples for cubic interpolation
      const samplePrev = i > 0 ? pcm16Buffer.readInt16LE(sourceIdx - 2) : pcm16Buffer.readInt16LE(sourceIdx);
      const sample0 = pcm16Buffer.readInt16LE(sourceIdx);
      const sample1 = i < sourceSamples - 1 ? pcm16Buffer.readInt16LE(sourceIdx + 2) : sample0;
      const sampleNext = i < sourceSamples - 2 ? pcm16Buffer.readInt16LE(sourceIdx + 4) : sample1;
      
      // Create 3 output samples using cubic Hermite interpolation for smoother audio
      // Sample 0: exactly source sample (t=0.0)
      targetBuffer.writeInt16LE(sample0, targetIdx);
      
      // Sample 1: cubic interpolated (t=0.33)
      const t1 = 1 / 3;
      const interpolated1 = this.cubicInterpolate(samplePrev, sample0, sample1, sampleNext, t1);
      const clamped1 = Math.max(-32768, Math.min(32767, interpolated1));
      targetBuffer.writeInt16LE(clamped1, targetIdx + 2);
      
      // Sample 2: cubic interpolated (t=0.67)
      const t2 = 2 / 3;
      const interpolated2 = this.cubicInterpolate(samplePrev, sample0, sample1, sampleNext, t2);
      const clamped2 = Math.max(-32768, Math.min(32767, interpolated2));
      targetBuffer.writeInt16LE(clamped2, targetIdx + 4);
    }
    
    return targetBuffer;
  }

  /**
   * Cubic Hermite interpolation for smooth audio resampling
   * Provides better quality than linear interpolation
   */
  private cubicInterpolate(y0: number, y1: number, y2: number, y3: number, t: number): number {
    // Cubic Hermite interpolation using Catmull-Rom spline
    const t2 = t * t;
    const t3 = t2 * t;
    
    const a = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
    const b = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    const c = -0.5 * y0 + 0.5 * y2;
    const d = y1;
    
    return a * t3 + b * t2 + c * t + d;
  }

  /**
   * Enhance audio quality with high-pass filtering and normalization
   * Applied to output audio (AI → Twilio) for crystal clear sound
   */
  private enhanceAudioQuality(pcm16Buffer: Buffer): Buffer {
    const sampleCount = pcm16Buffer.length / 2;
    if (sampleCount === 0) return pcm16Buffer;
    
    const enhancedBuffer = Buffer.from(pcm16Buffer);
    
    // High-pass filter to remove low-frequency noise/hum (below ~80Hz at 8kHz)
    // First-order IIR high-pass filter with cutoff at ~80Hz
    // For 8kHz sample rate: fc = 80Hz, RC = 1/(2*π*fc) = ~0.002s
    // alpha = RC / (RC + 1/sampleRate) = RC / (RC + 0.000125) ≈ 0.94
    const alpha = 0.94; // Filter coefficient for ~80Hz cutoff at 8kHz
    let prevInput = 0;
    let prevOutput = 0;
    
    // Normalize audio to maximize clarity (prevent clipping)
    let maxAmplitude = 0;
    const samples: number[] = [];
    
    // First pass: Apply high-pass filter and find max amplitude
    for (let i = 0; i < sampleCount; i++) {
      const sample = pcm16Buffer.readInt16LE(i * 2);
      
      // First-order high-pass filter: y[n] = alpha * (y[n-1] + x[n] - x[n-1])
      const filtered = alpha * (prevOutput + sample - prevInput);
      prevInput = sample;
      prevOutput = filtered;
      
      const filteredInt = Math.round(filtered);
      samples.push(filteredInt);
      maxAmplitude = Math.max(maxAmplitude, Math.abs(filteredInt));
    }
    
    // Second pass: Normalize to ~92% of max range for optimal clarity
    // Only normalize if audio is not already at good levels
    const targetMax = 30145; // ~92% of 32767 for headroom
    const normalizationFactor = maxAmplitude > targetMax ? targetMax / maxAmplitude : 1.0;
    
    for (let i = 0; i < sampleCount; i++) {
      const normalized = Math.round(samples[i] * normalizationFactor);
      const clamped = Math.max(-32768, Math.min(32767, normalized));
      enhancedBuffer.writeInt16LE(clamped, i * 2);
    }
    
    return enhancedBuffer;
  }

  /**
   * Remove DC offset from PCM16 audio to reduce static
   * Only applied to output audio (AI → Twilio) to avoid affecting VAD on input
   */
  private removeDCOffset(pcm16Buffer: Buffer): Buffer {
    const sampleCount = pcm16Buffer.length / 2;
    if (sampleCount === 0) return pcm16Buffer;
    
    // Calculate DC offset (average sample value) using a rolling window
    // Use only recent samples to avoid affecting VAD on silence detection
    const windowSize = Math.min(480, sampleCount); // ~20ms at 24kHz, ~60ms at 8kHz
    const startIdx = Math.max(0, sampleCount - windowSize);
    
    let sum = 0;
    for (let i = startIdx; i < sampleCount; i++) {
      sum += pcm16Buffer.readInt16LE(i * 2);
    }
    const dcOffset = Math.round(sum / windowSize);
    
    // Only remove DC offset if it's significant (reduces unnecessary processing)
    // Increased threshold to avoid affecting small signals
    if (Math.abs(dcOffset) < 50) return pcm16Buffer; // Skip if offset is negligible
    
    // Remove DC offset
    const correctedBuffer = Buffer.from(pcm16Buffer);
    for (let i = 0; i < sampleCount; i++) {
      const sample = pcm16Buffer.readInt16LE(i * 2);
      const corrected = sample - dcOffset;
      const clamped = Math.max(-32768, Math.min(32767, corrected));
      correctedBuffer.writeInt16LE(clamped, i * 2);
    }
    
    return correctedBuffer;
  }

  /**
   * Convert PCM16 audio to MuLaw (G.711 μ-law)
   * PCM16 is 16-bit signed integers, MuLaw is 8-bit encoded
   * Standard ITU-T G.711 μ-law encoding algorithm
   */
  private pcm16ToMulaw(pcm16Buffer: Buffer): Buffer {
    const mulawBuffer = Buffer.allocUnsafe(pcm16Buffer.length / 2);
    
    // Standard G.711 μ-law encoding (optimized for accuracy)
    // Reference: ITU-T G.711 specification
    const BIAS = 33; // Standard G.711 bias
    const MAX = 32635; // Maximum value for μ-law encoding
    
    // Use a simple smoothing filter to reduce quantization noise
    let prevSample = 0;
    const smoothingFactor = 0.1; // Light smoothing to reduce artifacts
    
    for (let i = 0; i < mulawBuffer.length; i++) {
      // Read 16-bit signed integer (little-endian, as OpenAI sends)
      let sample = pcm16Buffer.readInt16LE(i * 2);
      
      // Apply light smoothing to reduce quantization noise/artifacts
      // Only apply minimal smoothing to preserve audio clarity
      sample = Math.round(sample * (1 - smoothingFactor) + prevSample * smoothingFactor);
      prevSample = sample;
      
      // Get sign bit (bit 15)
      const sign = (sample >>> 15) & 0x01;
      
      // Get magnitude (absolute value)
      let magnitude = Math.abs(sample);
      
      // Clamp to valid range to prevent overflow
      magnitude = Math.min(magnitude, MAX);
      
      // Add bias for proper encoding
      magnitude += BIAS;
      
      // Find exponent (segment) using efficient threshold checking
      // This provides accurate segment detection for crystal clear encoding
      let exponent = 0;
      if (magnitude >= 0x7FF) exponent = 7;
      else if (magnitude >= 0x3FF) exponent = 6;
      else if (magnitude >= 0x1FF) exponent = 5;
      else if (magnitude >= 0xFF) exponent = 4;
      else if (magnitude >= 0x7F) exponent = 3;
      else if (magnitude >= 0x3F) exponent = 2;
      else if (magnitude >= 0x1F) exponent = 1;
      // else exponent = 0 (already set)
      
      // Calculate mantissa (4-bit quantization) from original magnitude
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
      // Twilio sends audio/x-mulaw at 8kHz
      const pcm16Audio8k = this.mulawToPcm16(audioData);
      
      // OpenAI Realtime API expects PCM16 at 24kHz
      // Upsample from 8kHz to 24kHz (1:3 ratio)
      // Note: Don't remove DC offset on input audio as it can interfere with VAD
      const pcm16Audio24k = this.resample8kTo24k(pcm16Audio8k);
      
      // Debug: Check if audio is non-zero (not silence)
      const sampleCount8k = pcm16Audio8k.length / 2; // Each sample is 2 bytes
      const sampleCount24k = pcm16Audio24k.length / 2;
      let nonZeroSamples = 0;
      let maxAmplitude = 0;
      for (let i = 0; i < sampleCount24k; i++) {
        const sample = pcm16Audio24k.readInt16LE(i * 2);
        if (sample !== 0) nonZeroSamples++;
        maxAmplitude = Math.max(maxAmplitude, Math.abs(sample));
      }
      
      // Log audio statistics for first few chunks to verify conversion
      if (!this._inputAudioChunkCount) this._inputAudioChunkCount = 0;
      this._inputAudioChunkCount++;
      if (this._inputAudioChunkCount <= 5) {
        console.log(`📥 Input audio chunk #${this._inputAudioChunkCount}: MuLaw ${audioData.length} bytes → PCM16 8kHz ${pcm16Audio8k.length} bytes → PCM16 24kHz ${pcm16Audio24k.length} bytes`);
        console.log(`   Non-zero samples: ${nonZeroSamples}/${sampleCount24k}, max amplitude: ${maxAmplitude}`);
        // Log first few MuLaw bytes to see if they're all the same
        const firstBytes = Array.from(audioData.slice(0, Math.min(10, audioData.length))).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ');
        console.log(`   First MuLaw bytes: ${firstBytes}`);
      }
      
      // Convert PCM16 buffer (24kHz) to base64
      const base64Audio = pcm16Audio24k.toString("base64");
      
      // Send audio to OpenAI Realtime API
      // Now the audio is in PCM16 format at 24kHz as expected by OpenAI
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
