import { FastifyPluginAsync } from "fastify";
import { prisma } from "../config/database.js";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";

const metricsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", authenticate);

  fastify.get("/", async (request: AuthenticatedRequest) => {
    const organizationId = request.organizationId!;

    // Get date range (default to last 30 days)
    const days = Number((request.query as { days?: string }).days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total conversations
    const totalConversations = await prisma.conversation.count({
      where: {
        organizationId,
        startTime: { gte: startDate },
      },
    });

    // Conversations with leads
    const conversationsWithLeads = await prisma.conversation.count({
      where: {
        organizationId,
        startTime: { gte: startDate },
        isLead: true,
      },
    });

    // Total leads
    const totalLeads = await prisma.lead.count({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
    });

    // Leads with appointments
    const leadsWithAppointments = await prisma.lead.count({
      where: {
        organizationId,
        createdAt: { gte: startDate },
        scheduledDate: { not: null },
      },
    });

    // Missed conversations (conversations without leads)
    const missedConversations = await prisma.conversation.count({
      where: {
        organizationId,
        startTime: { gte: startDate },
        status: "missed",
      },
    });

    // Conversion rate
    const conversionRate = totalConversations > 0 ? (conversationsWithLeads / totalConversations) * 100 : 0;
    const bookingRate = totalLeads > 0 ? (leadsWithAppointments / totalLeads) * 100 : 0;

    return {
      period: { days, startDate },
      calls: {
        total: totalConversations,
        withLeads: conversationsWithLeads,
        missed: missedConversations,
        conversionRate: Math.round(conversionRate * 100) / 100,
      },
      leads: {
        total: totalLeads,
        withAppointments: leadsWithAppointments,
        bookingRate: Math.round(bookingRate * 100) / 100,
      },
    };
  });
};

export default metricsRoutes;


