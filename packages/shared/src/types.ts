// Shared TypeScript types

export type AgentVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export type CallOutcome = "lead_captured" | "missed" | "transferred" | "completed" | "failed";

export type LeadStatus = "new" | "in_progress" | "contacted" | "converted" | "lost";

export interface AgentProfileConfig {
  voice: AgentVoice;
  tone: number; // 0-100
  pace: number;
  confidence: number;
  energy: number;
  fillerLevel: number;
  interruptionSensitivity: number;
  empathyLevel: number;
  formality: number;
  welcomePrompt: string;
}

export interface BusinessProfileConfig {
  companyName: string;
  description?: string;
  serviceAreas?: string;
  servicesOffered?: string;
  pricingInfo?: string;
  policies?: string;
  faq?: string;
}


