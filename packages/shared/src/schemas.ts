import { z } from "zod";

// Auth schemas
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(1),
});

// Agent Profile schemas
export const AgentProfileUpdateSchema = z.object({
  voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).optional(),
  tone: z.number().min(0).max(100).optional(),
  pace: z.number().min(0).max(100).optional(),
  confidence: z.number().min(0).max(100).optional(),
  energy: z.number().min(0).max(100).optional(),
  fillerLevel: z.number().min(0).max(100).optional(),
  interruptionSensitivity: z.number().min(0).max(100).optional(),
  empathyLevel: z.number().min(0).max(100).optional(),
  formality: z.number().min(0).max(100).optional(),
  welcomePrompt: z.string().optional(),
});

// Business Profile schemas
export const BusinessProfileUpdateSchema = z.object({
  companyName: z.string().min(1).optional(),
  description: z.string().optional(),
  serviceAreas: z.string().optional(),
  servicesOffered: z.string().optional(),
  pricingInfo: z.string().optional(),
  policies: z.string().optional(),
  faq: z.string().optional(),
});

// Lead schemas
export const LeadUpdateSchema = z.object({
  status: z.enum(["new", "in_progress", "contacted", "converted", "lost"]).optional(),
  notes: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Integration schemas
export const IntegrationUpdateSchema = z.object({
  calendlyLink: z.string().url().optional().nullable(),
  zapierHookUrl: z.string().url().optional().nullable(),
  emergencyNumber: z.string().optional().nullable(),
});


