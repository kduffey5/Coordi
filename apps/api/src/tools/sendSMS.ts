import twilio from "twilio";
import { prisma } from "../config/database.js";
import type { ToolContext } from "./index.js";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(args: any, context: ToolContext) {
  const { organizationId, callerNumber } = context;
  const { message, toNumber } = args;

  const targetNumber = toNumber || callerNumber;

  if (!targetNumber) {
    return {
      success: false,
      error: "No phone number available to send SMS",
    };
  }

  try {
    // Get organization's Twilio number
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const fromNumber = org?.twilioNumber || process.env.TWILIO_NUMBER;

    if (!fromNumber) {
      return {
        success: false,
        error: "No Twilio number configured",
      };
    }

    // Send SMS
    const sms = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: targetNumber,
    });

    return {
      success: true,
      messageSid: sms.sid,
      message: "SMS sent successfully",
    };
  } catch (error: any) {
    console.error("SMS sending error:", error);
    return {
      success: false,
      error: error.message || "Failed to send SMS",
    };
  }
}
