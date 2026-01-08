import { FastifyPluginAsync } from "fastify";
import { prisma } from "../config/database.js";
import { LeadUpdateSchema } from "@coordi/shared";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";

const leadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", authenticate);

  // List leads
  fastify.get("/", async (request: AuthenticatedRequest) => {
    const organizationId = request.organizationId!;
    const limit = Number((request.query as { limit?: string }).limit) || 50;
    const offset = Number((request.query as { offset?: string }).offset) || 0;
    const status = (request.query as { status?: string }).status;

    const where: any = { organizationId };
    if (status) {
      where.status = status;
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        call: true,
      },
    });

    const total = await prisma.lead.count({ where });

    return {
      leads,
      total,
      limit,
      offset,
    };
  });

  // Get single lead
  fastify.get("/:id", async (request: AuthenticatedRequest, reply) => {
    const organizationId = request.organizationId!;
    const id = (request.params as { id: string }).id;

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        call: true,
      },
    });

    if (!lead) {
      return reply.code(404).send({ error: "Lead not found" });
    }

    return lead;
  });

  // Update lead
  fastify.put("/:id", async (request: AuthenticatedRequest, reply) => {
    try {
      const organizationId = request.organizationId!;
      const id = (request.params as { id: string }).id;
      const body = LeadUpdateSchema.parse(request.body);

      const lead = await prisma.lead.findFirst({
        where: { id, organizationId },
      });

      if (!lead) {
        return reply.code(404).send({ error: "Lead not found" });
      }

      const updated = await prisma.lead.update({
        where: { id },
        data: body,
      });

      return updated;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({ error: "Invalid request" });
    }
  });
};

export default leadRoutes;


