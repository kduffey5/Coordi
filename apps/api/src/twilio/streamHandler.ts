import { prisma } from "../config/database.js";
import { OpenAIBridge } from "./openaiBridge.js";
import { handleToolCall } from "../tools/index.js";
import type { CallSession, TwilioMediaStreamMessage } from "./types.js";
import type WebSocket from "ws";

interface SocketStream {
  socket: WebSocket;
}

export class TwilioStreamHandler {
  private socket: SocketStream;
  private callSession: CallSession | null = null;
  private openAIBridge: OpenAIBridge | null = null;

  constructor(socket: SocketStream) {
    this.socket = socket;
    this.setupHandlers();
  }

  private setupHandlers() {
    this.socket.socket.on("message", async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString()) as TwilioMediaStreamMessage;
        await this.handleMessage(data);
      } catch (error) {
        console.error("Error handling Twilio message:", error);
      }
    });

    this.socket.socket.on("close", async () => {
      await this.cleanup();
    });

    this.socket.socket.on("error", (error: Error) => {
      console.error("WebSocket error:", error);
      this.cleanup();
    });
  }

  private async handleMessage(data: TwilioMediaStreamMessage) {
    switch (data.event) {
      case "start":
        await this.handleStart(data);
        break;

      case "media":
        await this.handleMedia(data);
        break;

      case "stop":
        await this.handleStop(data);
        break;

      case "connected":
        // Connection confirmed
        break;

      case "error":
        console.error("Twilio stream error:", data);
        await this.cleanup();
        break;
    }
  }

  private async handleStart(data: TwilioMediaStreamMessage) {
    if (!data.callSid || !data.streamSid) {
      console.error("Missing callSid or streamSid in start event");
      return;
    }

    // Find organization by Twilio number or use default
    // For MVP, we'll use a default org or look up by phone number
    const org = await this.findOrganization(data);

    if (!org) {
      console.error("Organization not found for call");
      this.socket.socket.close();
      return;
    }

    // Create call session
    this.callSession = {
      callSid: data.callSid,
      streamSid: data.streamSid,
      organizationId: org.id,
      startTime: new Date(),
      transcript: [],
    };

    // Create call record in database
    try {
      await prisma.call.create({
        data: {
          organizationId: org.id,
          fromNumber: data.customParameters?.From || "",
          toNumber: data.customParameters?.To || org.twilioNumber || "",
          twilioCallSid: data.callSid,
          startTime: new Date(),
        },
      });
    } catch (error) {
      console.error("Error creating call record:", error);
    }

    // Initialize OpenAI bridge
    try {
      this.openAIBridge = new OpenAIBridge(this.callSession, org.id);
      
      // Pass Twilio socket reference to bridge so it can send audio back
      this.openAIBridge.setTwilioSocket(this.socket.socket);
      
      // Set up tool call handler
      this.openAIBridge.onToolCallCallback(async (toolCall) => {
        return await handleToolCall(toolCall, {
          organizationId: org.id,
          callSid: data.callSid!,
          callerNumber: data.customParameters?.From || "",
        });
      });

      await this.openAIBridge.initialize();

      // Set up audio streaming
      this.setupAudioStreaming();
    } catch (error) {
      console.error("Error initializing OpenAI bridge:", error);
      // Send error message to caller via Twilio
      this.sendTwilioMessage({
        event: "media",
        streamSid: data.streamSid,
        media: {
          payload: Buffer.from("Sorry, I'm having trouble connecting. Please try again later.").toString("base64"),
        },
      });
    }
  }

  private async findOrganization(data: TwilioMediaStreamMessage) {
    // Try to find org by Twilio number
    const toNumber = data.customParameters?.To;
    if (toNumber) {
      const org = await prisma.organization.findFirst({
        where: { twilioNumber: toNumber },
      });
      if (org) return org;
    }

    // For MVP, get first organization or create default
    // In production, you'd properly map numbers to orgs
    const org = await prisma.organization.findFirst();
    return org;
  }

  private setupAudioStreaming() {
    // Audio streaming is now handled directly in handleMedia
    // Audio chunks are sent immediately to OpenAI as they arrive from Twilio
    // OpenAI handles buffering internally
    console.log("Audio streaming ready - audio will be sent directly to OpenAI");
  }

  private async handleMedia(data: TwilioMediaStreamMessage) {
    if (!data.media || !data.media.payload) return;
    
    // Only process inbound audio (from caller)
    if (data.media.track !== "inbound") return;

    // Decode base64 audio from Twilio (PCM16, 8kHz)
    const audioChunk = Buffer.from(data.media.payload, "base64");

    // Send audio directly to OpenAI (no buffering needed, OpenAI handles buffering)
    if (this.openAIBridge) {
      await this.openAIBridge.sendAudio(audioChunk);
    }
  }

  private sendTwilioMessage(message: any) {
    if (this.socket.socket.readyState === this.socket.socket.OPEN) {
      this.socket.socket.send(JSON.stringify(message));
    }
  }

  private async handleStop(data: TwilioMediaStreamMessage) {
    await this.cleanup();
  }

  private async cleanup() {
    // Close OpenAI connection
    if (this.openAIBridge) {
      try {
        await this.openAIBridge.close();
      } catch (error) {
        console.error("Error closing OpenAI bridge:", error);
      }
    }

    // Update call record
    if (this.callSession) {
      try {
        const call = await prisma.call.findUnique({
          where: { twilioCallSid: this.callSession.callSid },
        });

        if (call) {
          const duration = Math.floor(
            (new Date().getTime() - call.startTime.getTime()) / 1000
          );

          await prisma.call.update({
            where: { id: call.id },
            data: {
              endTime: new Date(),
              durationSeconds: duration,
              transcript: this.callSession.transcript.join("\n"),
              // Generate summary if we have transcript
              summary: this.generateSummary(this.callSession.transcript),
            },
          });
        }
      } catch (error) {
        console.error("Error updating call record:", error);
      }
    }

    // Close WebSocket
    if (this.socket.socket.readyState === this.socket.socket.OPEN) {
      this.socket.socket.close();
    }
  }

  private generateSummary(transcript: string[]): string {
    if (transcript.length === 0) return "No conversation recorded";
    
    // Simple summary - in production, use GPT to generate better summaries
    const lines = transcript.slice(-5); // Last 5 lines
    return lines.join(" ").substring(0, 500);
  }
}
