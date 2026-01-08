// Types for Twilio Media Streams

export interface TwilioMediaStreamMessage {
  event: "start" | "media" | "stop" | "connected" | "error";
  streamSid?: string;
  accountSid?: string;
  callSid?: string;
  tracks?: string[];
  media?: {
    track: "inbound" | "outbound";
    chunk: string;
    timestamp: string;
    payload: string; // Base64 encoded audio
  };
  customParameters?: {
    [key: string]: string;
  };
}

export interface CallSession {
  callSid: string;
  streamSid: string;
  organizationId: string;
  startTime: Date;
  openAISessionId?: string;
  transcript: string[];
  metadata?: Record<string, any>;
}
