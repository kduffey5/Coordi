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

  constructor(callSession: CallSession, organizationId: string) {
    this.callSession = callSession;
    this.organizationId = organizationId;
  }

  setTwilioSocket(socket: any) {
    this.twilioSocket = socket;
  }

  async initialize() {
    // Get agent profile for system prompt
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
      throw new Error("Agent profile not found");
    }

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
        
        // Send initial greeting after session is configured
        setTimeout(() => {
          this.sendInitialGreeting();
        }, 1000);
      });

      ws.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
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
        this.session.state = "closed";
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
      case "session.created":
        console.log("OpenAI session created:", message.session.id);
        this.callSession.openAISessionId = message.session.id;
        break;

      case "response.audio.delta":
        // Audio output from AI - send to Twilio
        if (message.delta && this.twilioSocket && this.callSession) {
          this.sendAudioToTwilio(message.delta);
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
      this.session.ws.send(JSON.stringify(message));
    }
  }

  private sendAudioToTwilio(audioBase64: string) {
    if (!this.twilioSocket || !this.callSession) return;

    try {
      const twilioMessage = {
        event: "media",
        streamSid: this.callSession.streamSid,
        media: {
          payload: audioBase64,
        },
      };

      if (this.twilioSocket.readyState === 1) {
        this.twilioSocket.send(JSON.stringify(twilioMessage));
      }
    } catch (error) {
      console.error("Error sending audio to Twilio:", error);
    }
  }

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
      return;
    }

    try {
      // Send session update to configure the session
      this.sendToOpenAI({
        type: "session.update",
        session: {
          modalities: ["audio", "text"],
          instructions: systemPrompt,
          voice: agentProfile.voice || "alloy",
          temperature: 0.8,
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
    
    try {
      // Create a user message that will trigger the AI to respond with the greeting
      // The system prompt already instructs it to start with this greeting
      this.sendToOpenAI({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Start the conversation now.",
            },
          ],
        },
      });

      // Also trigger a response to get the AI speaking
      this.sendToOpenAI({
        type: "response.create",
        response: {
          modalities: ["audio"],
        },
      });

      this.callSession.transcript.push(`AI: ${greeting}`);
    } catch (error) {
      console.error("Error sending initial greeting:", error);
    }
  }

  async sendAudio(audioData: Buffer) {
    if (!this.session?.ws || this.session.ws.readyState !== 1 || !this.isInitialized) {
      return;
    }

    try {
      // Convert audio buffer to base64
      const base64Audio = audioData.toString("base64");
      
      // Send audio to OpenAI Realtime API
      // The audio format should be PCM16 at 8kHz (matching Twilio's format)
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
