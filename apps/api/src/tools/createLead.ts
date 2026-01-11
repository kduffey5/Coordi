import { prisma } from "../config/database.js";
import type { ToolContext } from "./index.js";

export async function createLead(args: any, context: ToolContext) {
  const { organizationId, callSid, callerNumber } = context;
  const {
    name,
    phone,
    email,
    address,
    serviceRequested,
    notes,
  } = args;

  // Find or create conversation record
  let conversation = await prisma.conversation.findUnique({
    where: { twilioCallSid: callSid },
  });

  if (!conversation) {
    // Conversation record should exist, but create if missing
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    
    conversation = await prisma.conversation.create({
      data: {
        organizationId,
        fromNumber: callerNumber,
        toNumber: org?.twilioNumber || "",
        twilioCallSid: callSid,
        status: "new",
        isLead: false,
      },
    });
  }

  // Create the lead
  const lead = await prisma.lead.create({
    data: {
      organizationId,
      conversationId: conversation.id,
      name: name || null,
      phone: phone || callerNumber,
      email: email || null,
      address: address || null,
      serviceRequested: serviceRequested || null,
      notes: notes || null,
      status: "new",
    },
  });

  // Update conversation record - mark as lead
  const updatedConversation = await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      isLead: true,
      status: "new",
    },
  });

  // Trigger notification for new lead (non-blocking)
  notifyNewLead(updatedConversation.id, organizationId).catch((error) => {
    console.error(`Failed to send lead notification for conversation ${updatedConversation.id}:`, error);
  });

  return {
    success: true,
    leadId: lead.id,
    message: `Lead created successfully. Reference: ${lead.id.substring(0, 8)}`,
  };
}
