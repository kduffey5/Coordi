import { prisma } from "../config/database.js";
import twilio from "twilio";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function notifyNewLead(conversationId: string, organizationId: string) {
  try {
    // Fetch conversation with organization details
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        organization: {
          include: {
            users: true,
          },
        },
        lead: true,
      },
    });

    if (!conversation) {
      console.error(`Conversation ${conversationId} not found for lead notification`);
      return;
    }

    // Get organization owner/primary user
    const owner = conversation.organization.users[0];
    if (!owner) {
      console.log(`No owner found for organization ${organizationId}`);
      return;
    }

    // Get integration settings (emergency number can be used as owner's phone)
    const integration = await prisma.integration.findUnique({
      where: { organizationId },
    });

    const ownerPhone = integration?.emergencyNumber;
    if (!ownerPhone) {
      console.log(`No phone number configured for owner of organization ${organizationId}`);
      return;
    }

    // Format the notification message
    const callerName = conversation.lead?.name || "Unknown";
    const serviceRequested = conversation.lead?.serviceRequested || "service inquiry";
    const summary = conversation.summary || "New lead from phone conversation";
    
    const message = `📞 New Lead: ${callerName} wants ${serviceRequested}. ${summary.substring(0, 100)}... View: ${process.env.FRONTEND_URL || "https://coordi.app"}/conversations?filter=lead`;

    // Send SMS via Twilio
    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER || conversation.organization.twilioNumber || "",
        to: ownerPhone,
      });
      console.log(`✅ Lead notification sent to ${ownerPhone} for conversation ${conversationId}`);
    } catch (smsError: any) {
      console.error(`Error sending SMS notification:`, smsError);
      // Don't throw - we'll log but not fail the request
    }

    // TODO: Add email notification support here
    // You could use SendGrid, AWS SES, etc.
    
  } catch (error: any) {
    console.error(`Error in notifyNewLead for conversation ${conversationId}:`, error);
    // Don't throw - notifications are non-blocking
  }
}
