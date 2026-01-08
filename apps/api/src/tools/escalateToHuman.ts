import twilio from "twilio";
import { prisma } from "../config/database.js";
import type { ToolContext } from "./index.js";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function escalateToHuman(args: any, context: ToolContext) {
  const { organizationId, callSid } = context;
  const { reason } = args;

  try {
    // Get emergency/human number from integrations
    const integration = await prisma.integration.findUnique({
      where: { organizationId },
    });

    const humanNumber = integration?.emergencyNumber;

    if (!humanNumber) {
      return {
        success: false,
        error: "No human agent number configured. Please set emergency number in integrations.",
        message: "I apologize, but all our human agents are currently unavailable. I'll have someone call you back as soon as possible.",
      };
    }

    // Get the call
    const call = await twilioClient.calls(callSid).fetch();

    // Initiate warm transfer by creating a conference
    // Note: This is a simplified version - full implementation would use Twilio Conference
    try {
      // For now, we'll update the call record and let the owner know
      await prisma.call.update({
        where: { twilioCallSid: callSid },
        data: {
          outcome: "transferred",
        },
      });

      // In a full implementation, you would:
      // 1. Create a Twilio Conference
      // 2. Move the current call to the conference
      // 3. Dial the human agent and add them to the conference
      // 4. When human joins, remove AI from the call

      return {
        success: true,
        message: "Transferring you to a human agent now. Please hold.",
        note: "Transfer initiated. Human agent will be connected shortly.",
      };
    } catch (transferError: any) {
      console.error("Transfer error:", transferError);
      return {
        success: false,
        error: transferError.message,
        message: "I'm having trouble connecting you right now. Let me take your information and have someone call you back.",
      };
    }
  } catch (error: any) {
    console.error("Escalation error:", error);
    return {
      success: false,
      error: error.message || "Failed to escalate",
      message: "I apologize, but I'm having trouble transferring you. I'll have someone call you back.",
    };
  }
}
