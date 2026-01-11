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
export const CompanyInfoSchema = z.object({
  businessName: z.string().min(1),
  greetingFormat: z.string().optional(),
  phoneNumber: z.string().optional(),
  serviceHours: z.string().optional(),
  afterHoursBehavior: z.enum(["take_lead_info", "send_booking_link", "escalate_emergency_only"]).optional(),
});

export const ServiceAreaConfigSchema = z.object({
  zipCodes: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
  outOfAreaResponse: z.enum(["collect_and_escalate", "politely_decline", "offer_referral"]).optional(),
});

export const ServiceQuestionSchema = z.object({
  question: z.string(),
  type: z.enum(["boolean", "text", "number"]).optional(),
});

export const ServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  quotingType: z.enum(["starting_at", "range_estimate", "manual_quote_only"]).optional(),
  startingPrice: z.number().optional(),
  priceRange: z.object({ min: z.number(), max: z.number() }).optional(),
  questions: z.array(ServiceQuestionSchema).optional(),
  addOns: z.array(z.string()).optional(),
});

export const ServicesConfigSchema = z.array(ServiceSchema);

export const PoliciesConfigSchema = z.object({
  cancellationPolicy: z.string().optional(),
  reschedulePolicy: z.string().optional(),
  rainPolicy: z.string().optional(),
  paymentTypes: z.array(z.string()).optional(),
  petGateAccess: z.string().optional(),
  satisfactionGuarantee: z.string().optional(),
});

export const LocalKnowledgeEntrySchema = z.object({
  text: z.string(),
  locationTag: z.string().optional(),
});

export const LocalKnowledgeSchema = z.array(LocalKnowledgeEntrySchema);

export const VoiceBehaviorSchema = z.object({
  tone: z.enum(["casual", "friendly", "professional", "authoritative"]).optional(),
  empathy: z.enum(["low", "medium", "high"]).optional(),
  preferredWords: z.record(z.string()).optional(), // e.g. { "quote": "estimate", "biweekly": "every two weeks" }
  referToTeamByName: z.boolean().optional(),
});

export const BusinessProfileUpdateSchema = z.object({
  companyName: z.string().min(1).optional(),
  description: z.string().optional(),
  serviceAreas: z.string().optional(),
  servicesOffered: z.string().optional(),
  pricingInfo: z.string().optional(),
  policies: z.string().optional(),
  faq: z.string().optional(),
  // New structured fields
  companyInfo: CompanyInfoSchema.optional(),
  serviceAreaConfig: ServiceAreaConfigSchema.optional(),
  servicesConfig: ServicesConfigSchema.optional(),
  pricingPhilosophy: z.enum(["soft_ranges", "quote_with_photos", "never_discuss_price"]).optional(),
  policiesConfig: PoliciesConfigSchema.optional(),
  localKnowledge: LocalKnowledgeSchema.optional(),
  voiceBehavior: VoiceBehaviorSchema.optional(),
  lawnExpertMode: z.boolean().optional(),
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


