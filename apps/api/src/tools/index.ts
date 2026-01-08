import { prisma } from "../config/database.js";
import { createLead } from "./createLead.js";
import { bookEstimate } from "./bookEstimate.js";
import { sendSMS } from "./sendSMS.js";
import { escalateToHuman } from "./escalateToHuman.js";
import type { ToolCall } from "../twilio/openaiBridge.js";

export interface ToolContext {
  organizationId: string;
  callSid: string;
  callerNumber: string;
}

export async function handleToolCall(
  toolCall: ToolCall,
  context: ToolContext
): Promise<any> {
  const { name, arguments: args } = toolCall;

  switch (name) {
    case "create_lead":
      return await createLead(args, context);

    case "book_estimate":
      return await bookEstimate(args, context);

    case "send_sms":
      return await sendSMS(args, context);

    case "escalate_to_human":
      return await escalateToHuman(args, context);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Define tool schemas for OpenAI (used in system prompt)
export const TOOL_SCHEMAS = [
  {
    type: "function",
    name: "create_lead",
    description: "Create a new lead with caller information. Use this when you have the caller's name and at least one contact method (phone or email).",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Caller's full name" },
        phone: { type: "string", description: "Caller's phone number" },
        email: { type: "string", description: "Caller's email address" },
        address: { type: "string", description: "Caller's address" },
        serviceRequested: {
          type: "string",
          description: "Service the caller is interested in",
        },
        notes: {
          type: "string",
          description: "Additional notes about the lead",
        },
      },
      required: ["name"],
    },
  },
  {
    type: "function",
    name: "book_estimate",
    description: "Book an appointment or estimate. Use this when the caller wants to schedule a specific date/time.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Caller's name" },
        phone: { type: "string", description: "Caller's phone number" },
        email: { type: "string", description: "Caller's email" },
        address: { type: "string", description: "Service address" },
        requestedDate: {
          type: "string",
          description: "Requested date/time in ISO format",
        },
        serviceType: {
          type: "string",
          description: "Type of service needed",
        },
        notes: { type: "string", description: "Additional notes" },
      },
      required: ["name", "requestedDate"],
    },
  },
  {
    type: "function",
    name: "send_sms",
    description: "Send an SMS text message to the caller. Use this for follow-ups, confirmations, or sending links.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The message to send",
        },
        toNumber: {
          type: "string",
          description: "Phone number to send to (defaults to caller)",
        },
      },
      required: ["message"],
    },
  },
  {
    type: "function",
    name: "escalate_to_human",
    description: "Transfer the call to a human agent. Use this if the caller specifically requests to talk to a person, or if you cannot help with their request.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Reason for escalation",
        },
      },
      required: [],
    },
  },
];
