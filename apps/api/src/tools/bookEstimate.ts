import { prisma } from "../config/database.js";
import type { ToolContext } from "./index.js";

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

  // Find or create call record
  let call = await prisma.call.findUnique({
    where: { twilioCallSid: callSid },
  });

  if (!call) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    
    call = await prisma.call.create({
      data: {
        organizationId,
        fromNumber: callerNumber,
        toNumber: org?.twilioNumber || "",
        twilioCallSid: callSid,
      },
    });
  }

  // Create or update lead with appointment
  const lead = await prisma.lead.upsert({
    where: { callId: call.id },
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
      callId: call.id,
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

  // Update call record
  await prisma.call.update({
    where: { id: call.id },
    data: {
      outcome: "lead_captured",
    },
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
