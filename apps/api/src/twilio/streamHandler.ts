import { prisma } from "../config/database.js";
import { OpenAIBridge } from "./openaiBridge.js";
import { handleToolCall } from "../tools/index.js";
import type { CallSession, TwilioMediaStreamMessage } from "./types.js";
import type WebSocket from "ws";

export class TwilioStreamHandler {
  private socket: WebSocket;
  private callSession: CallSession | null = null;
  private openAIBridge: OpenAIBridge | null = null;
  private reqUrl: string | undefined;
  private _mediaChunkCount: number = 0;

  constructor(connection: WebSocket | any, req?: any) {
    // Handle both WebSocket directly or wrapper object (SocketStream) with .socket property
    // In @fastify/websocket v10, it might be either depending on configuration
    let socket: WebSocket;
    
    // Check if connection has a .socket property (wrapper) or is the socket itself
    if (connection?.socket && typeof connection.socket.on === "function") {
      socket = connection.socket;
      console.log("Using socket from connection.socket (wrapper)");
    } else if (connection && typeof connection.on === "function") {
      socket = connection;
      console.log("Using connection directly as WebSocket");
    } else {
      console.error("Invalid connection object:", {
        connectionType: typeof connection,
        connectionKeys: connection ? Object.keys(connection) : [],
        hasSocket: !!connection?.socket,
        hasOn: typeof connection?.on,
        socketHasOn: typeof connection?.socket?.on,
      });
      throw new Error("Invalid connection: missing WebSocket");
    }
    
    this.socket = socket;
    this.reqUrl = req?.url;
    console.log("TwilioStreamHandler initialized. Waiting for 'start' event.");
    this.setupHandlers();
  }

  private setupHandlers() {
    this.socket.on("message", async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString()) as TwilioMediaStreamMessage;
        await this.handleMessage(data);
      } catch (error) {
        console.error("Error handling Twilio message:", error);
      }
    });

    this.socket.on("close", async () => {
      console.log("Twilio stream closed.");
      await this.cleanup();
    });

    this.socket.on("error", (error: Error) => {
      console.error("Twilio WebSocket error:", error);
      this.cleanup();
    });
  }

  private async handleMessage(data: TwilioMediaStreamMessage) {
    try {
      console.log("Twilio message received:", data.event);
      switch (data.event) {
        case "start":
          console.log("Twilio stream started.");
          await this.handleStart(data);
          break;

        case "media":
          await this.handleMedia(data);
          break;

        case "stop":
          console.log("Twilio stream stopped.");
          await this.handleStop(data);
          break;

        case "connected":
          console.log("Twilio stream connected.");
          // Connection confirmed
          break;

        case "error":
          console.error("Twilio stream error:", data);
          await this.cleanup();
          break;

        default:
          console.log("Unhandled Twilio message event:", data.event);
          break;
      }
    } catch (error) {
      console.error("Error handling Twilio message:", error);
    }
  }

  private async handleStart(data: TwilioMediaStreamMessage) {
    // Log full data structure for debugging - this is critical!
    console.log("=== Twilio START Event Debug ===");
    console.log("Full data object:", JSON.stringify(data, null, 2));
    console.log("Data keys:", Object.keys(data));
    
    // Twilio sends start event data in a nested structure: data.start.{callSid, customParameters, etc.}
    // The actual data is nested inside a "start" property when event is "start"
    const startData = (data as any).start || {};
    const customParams = startData.customParameters || data.customParameters || {};
    
    console.log("start object:", JSON.stringify(startData, null, 2));
    console.log("callSid from data.start.callSid:", startData.callSid);
    console.log("callSid from top level data.callSid:", data.callSid);
    console.log("streamSid from top level data.streamSid:", data.streamSid);
    console.log("streamSid from data.start.streamSid:", startData.streamSid);
    console.log("customParameters from data.start.customParameters:", JSON.stringify(startData.customParameters));
    console.log("customParameters from top level:", JSON.stringify(data.customParameters));
    
    // Get callSid from multiple possible locations
    // Priority: 1. data.start.callSid (most common in Twilio Media Streams)
    //           2. data.start.customParameters.CallSid (from TwiML parameters)
    //           3. data.callSid (top level, less common)
    const callSid = startData.callSid 
      || customParams.CallSid 
      || customParams.callSid
      || data.callSid 
      || (data as any).CallSid;
    
    // StreamSid can be at top level (most common) or nested in start object
    const streamSid = data.streamSid || startData.streamSid;
    
    console.log("Extracted values:", { callSid, streamSid });
    console.log("Custom params:", customParams);
    
    if (!callSid || !streamSid) {
      console.error("❌ CRITICAL: Missing callSid or streamSid", {
        callSid: !!callSid,
        streamSid: !!streamSid,
        hasStartObject: !!(data as any).start,
        startDataKeys: startData ? Object.keys(startData) : [],
        hasCustomParams: !!customParams,
        customParamKeys: customParams ? Object.keys(customParams) : [],
        allDataKeys: Object.keys(data),
      });
      console.error("Cannot proceed without callSid. Check TwiML parameters.");
      return;
    }

    // Find organization by Twilio number or use default
    // For MVP, we'll use a default org or look up by phone number
    console.log("Looking for organization...");
    const org = await this.findOrganization(data);
    
    if (!org) {
      console.error("❌ CRITICAL: Organization not found for call");
      console.error("Check that you have at least one organization in the database");
      console.error("You may need to register a user first, which creates an organization");
      this.socket.close();
      return;
    }
    
    console.log("✅ Organization found:", { id: org.id, name: org.name, twilioNumber: org.twilioNumber });


    // Create call session (use the extracted callSid)
    this.callSession = {
      callSid: callSid,
      streamSid: streamSid,
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
          twilioCallSid: callSid,
          startTime: new Date(),
        },
      });
      console.log("Call record created in DB:", callSid);
    } catch (error) {
      console.error("Error creating call record:", error);
    }

    // Initialize OpenAI bridge
    try {
      console.log("Creating OpenAI bridge...");
      
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        console.error("❌ CRITICAL: OPENAI_API_KEY environment variable is not set!");
        throw new Error("OPENAI_API_KEY not configured");
      }
      console.log("✅ OPENAI_API_KEY is configured (length:", process.env.OPENAI_API_KEY.length, ")");
      
      this.openAIBridge = new OpenAIBridge(this.callSession, org.id);
      
      // Pass Twilio socket reference to bridge so it can send audio back
      this.openAIBridge.setTwilioSocket(this.socket);
      
      console.log("OpenAI bridge created, initializing...");
      
      // Set up tool call handler
      this.openAIBridge.onToolCallCallback(async (toolCall) => {
        return await handleToolCall(toolCall, {
          organizationId: org.id,
          callSid: callSid,
          callerNumber: data.customParameters?.From || "",
        });
      });

      await this.openAIBridge.initialize();
      console.log("✅ OpenAI bridge initialized successfully");

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
    if (!data.media || !data.media.payload) {
      console.log("Media event missing payload");
      return;
    }
    
    // Log track information for debugging
    const track = data.media.track;
    if (!track || track === undefined) {
      // If track is missing, log it but process anyway (defensive approach)
      // Sometimes Twilio doesn't include track info in media events
      console.log("⚠️ Media event missing 'track' property - processing as inbound (defensive)");
    } else if (track !== "inbound") {
      // Only skip if explicitly marked as outbound
      console.log(`Ignoring outbound audio track: ${track}`);
      return;
    }
    
    // Decode base64 audio from Twilio (MuLaw, 8kHz - will be converted to PCM16 in sendAudio)
    const audioChunk = Buffer.from(data.media.payload, "base64");
    
    // Debug: Log audio chunk info for first few chunks
    if (!this._mediaChunkCount) this._mediaChunkCount = 0;
    this._mediaChunkCount++;
    if (this._mediaChunkCount <= 3) {
      console.log(`📥 Media chunk #${this._mediaChunkCount}: track=${track || 'undefined'}, payload length=${data.media.payload.length}, decoded bytes=${audioChunk.length}`);
    }

    // Send audio directly to OpenAI (no buffering needed, OpenAI handles buffering)
    // sendAudio will check if bridge is initialized, so we just try
    if (this.openAIBridge) {
      await this.openAIBridge.sendAudio(audioChunk);
    } else {
      console.warn("⚠️ OpenAI bridge not initialized, cannot send audio");
    }
  }

  private sendTwilioMessage(message: any) {
    if (this.socket.readyState === 1) { // WebSocket.OPEN === 1
      this.socket.send(JSON.stringify(message));
      console.log("Sent message to Twilio:", message.event);
    } else {
      console.warn("Cannot send message to Twilio - socket not open.");
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
    if (this.socket.readyState === 1) { // WebSocket.OPEN === 1
      this.socket.close();
      console.log("Twilio WebSocket closed.");
    }
  }

  private generateSummary(transcript: string[]): string {
    if (transcript.length === 0) return "No conversation recorded";
    
    // Simple summary - in production, use GPT to generate better summaries
    const lines = transcript.slice(-5); // Last 5 lines
    return lines.join(" ").substring(0, 500);
  }
}
