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

    // Total calls
    const totalCalls = await prisma.call.count({
      where: {
        organizationId,
        startTime: { gte: startDate },
      },
    });

    // Calls with leads
    const callsWithLeads = await prisma.call.count({
      where: {
        organizationId,
        startTime: { gte: startDate },
        lead: { isNot: null },
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

    // Missed calls (calls without leads)
    const missedCalls = totalCalls - callsWithLeads;

    // Conversion rate
    const conversionRate = totalCalls > 0 ? (callsWithLeads / totalCalls) * 100 : 0;
    const bookingRate = totalLeads > 0 ? (leadsWithAppointments / totalLeads) * 100 : 0;

    return {
      period: { days, startDate },
      calls: {
        total: totalCalls,
        withLeads: callsWithLeads,
        missed: missedCalls,
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


