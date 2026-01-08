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

  // Find or create call record
  let call = await prisma.call.findUnique({
    where: { twilioCallSid: callSid },
  });

  if (!call) {
    // Call record should exist, but create if missing
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

  // Create the lead
  const lead = await prisma.lead.create({
    data: {
      organizationId,
      callId: call.id,
      name: name || null,
      phone: phone || callerNumber,
      email: email || null,
      address: address || null,
      serviceRequested: serviceRequested || null,
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

  return {
    success: true,
    leadId: lead.id,
    message: `Lead created successfully. Reference: ${lead.id.substring(0, 8)}`,
  };
}
