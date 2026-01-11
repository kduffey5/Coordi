import { prisma } from "../config/database.js";
import type { ToolContext } from "./index.js";
import { notifyNewLead } from "../services/notifications.js";

export async function bookEstimate(args: any, context: ToolContext) {
  const { organizationId, callSid, callerNumber } = context;
  const {
    name,
    phone,
    email,
    address,
    requestedDate,
    serviceType,
    notes,
  } = args;

  // Parse the requested date
  const scheduledDate = requestedDate ? new Date(requestedDate) : null;

  // Find or create conversation record
  let conversation = await prisma.conversation.findUnique({
    where: { twilioCallSid: callSid },
  });

  if (!conversation) {
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

  // Create or update lead with appointment
  const lead = await prisma.lead.upsert({
    where: { conversationId: conversation.id },
    update: {
      name: name || undefined,
      phone: phone || callerNumber,
      email: email || undefined,
      address: address || undefined,
      serviceRequested: serviceType || undefined,
      scheduledDate: scheduledDate || undefined,
      notes: notes || undefined,
      status: "new",
    },
    create: {
      organizationId,
      conversationId: conversation.id,
      name: name || null,
      phone: phone || callerNumber,
      email: email || null,
      address: address || null,
      serviceRequested: serviceType || null,
      scheduledDate: scheduledDate || null,
      notes: notes || null,
      status: "new",
    },
  });

  // Update conversation record - mark as lead and booked
  const updatedConversation = await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      isLead: true,
      status: "booked",
    },
  });

  // Trigger notification for new lead (non-blocking)
  // Even though status is "booked", it's still a new lead that needs attention
  notifyNewLead(updatedConversation.id, organizationId).catch((error: any) => {
    console.error(`Failed to send lead notification for conversation ${updatedConversation.id}:`, error);
  });

  const formattedDate = scheduledDate
    ? scheduledDate.toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "date to be confirmed";

  return {
    success: true,
    leadId: lead.id,
    scheduledDate: formattedDate,
    message: `Appointment scheduled for ${formattedDate}. Reference: ${lead.id.substring(0, 8)}`,
  };
}
