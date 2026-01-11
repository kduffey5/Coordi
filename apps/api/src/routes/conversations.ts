import { FastifyPluginAsync } from "fastify";
import { prisma } from "../config/database.js";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";
import { notifyNewLead } from "../services/notifications.js";

const conversationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", authenticate);

  // List conversations with filtering
  fastify.get("/", async (request: AuthenticatedRequest) => {
    const organizationId = request.organizationId!;
    const limit = Number((request.query as { limit?: string }).limit) || 50;
    const offset = Number((request.query as { offset?: string }).offset) || 0;
    const status = (request.query as { status?: string }).status;
    const isLead = (request.query as { isLead?: string }).isLead;

    const where: any = { organizationId };
    
    // Filter by status (e.g., 'new', 'booked', 'followed_up', 'escalated', 'missed')
    if (status) {
      where.status = status;
    }
    
    // Filter by isLead flag
    if (isLead !== undefined) {
      where.isLead = isLead === "true";
    }
    
    // If status is 'lead', we want conversations where isLead is true
    if (status === "lead") {
      where.isLead = true;
      delete where.status; // Remove status filter since we're using isLead
    }

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { startTime: "desc" },
      take: limit,
      skip: offset,
      include: {
        lead: true,
      },
    });

    const total = await prisma.conversation.count({
      where,
    });

    return {
      conversations,
      total,
      limit,
      offset,
    };
  });

  // Get single conversation
  fastify.get("/:id", async (request: AuthenticatedRequest, reply) => {
    const organizationId = request.organizationId!;
    const id = (request.params as { id: string }).id;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        lead: true,
      },
    });

    if (!conversation) {
      return reply.code(404).send({ error: "Conversation not found" });
    }

    return conversation;
  });

  // Update conversation (for marking as lead, changing status, etc.)
  fastify.put("/:id", async (request: AuthenticatedRequest, reply) => {
    try {
      const organizationId = request.organizationId!;
      const id = (request.params as { id: string }).id;
      const body = request.body as {
        isLead?: boolean;
        status?: string;
        tags?: string[];
        summary?: string;
        transcript?: string;
      };

      const conversation = await prisma.conversation.findFirst({
        where: { id, organizationId },
      });

      if (!conversation) {
        return reply.code(404).send({ error: "Conversation not found" });
      }

      const updateData: any = {};
      if (body.isLead !== undefined) updateData.isLead = body.isLead;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.tags !== undefined) updateData.tags = body.tags;
      if (body.summary !== undefined) updateData.summary = body.summary;
      if (body.transcript !== undefined) updateData.transcript = body.transcript;

      const updated = await prisma.conversation.update({
        where: { id },
        data: updateData,
        include: {
          lead: true,
        },
      });

      // If this conversation was just marked as a lead with status 'new', trigger notification
      if (updated.isLead && updated.status === "new" && !conversation.isLead) {
        fastify.log.info(`New lead conversation created: ${updated.id}`);
        // Trigger notification asynchronously (non-blocking)
        notifyNewLead(updated.id, organizationId).catch((error) => {
          fastify.log.error({ err: error }, `Failed to send lead notification for conversation ${updated.id}`);
        });
      }

      return updated;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({ error: "Invalid request" });
    }
  });
};

export default conversationRoutes;
