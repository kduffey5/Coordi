import { FastifyPluginAsync } from "fastify";
import { prisma } from "../config/database.js";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";

const callRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", authenticate);

  // List calls
  fastify.get("/", async (request: AuthenticatedRequest) => {
    const organizationId = request.organizationId!;
    const limit = Number((request.query as { limit?: string }).limit) || 50;
    const offset = Number((request.query as { offset?: string }).offset) || 0;

    const calls = await prisma.call.findMany({
      where: { organizationId },
      orderBy: { startTime: "desc" },
      take: limit,
      skip: offset,
      include: {
        lead: true,
      },
    });

    const total = await prisma.call.count({
      where: { organizationId },
    });

    return {
      calls,
      total,
      limit,
      offset,
    };
  });

  // Get single call
  fastify.get("/:id", async (request: AuthenticatedRequest, reply) => {
    const organizationId = request.organizationId!;
    const id = (request.params as { id: string }).id;

    const call = await prisma.call.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        lead: true,
      },
    });

    if (!call) {
      return reply.code(404).send({ error: "Call not found" });
    }

    return call;
  });
};

export default callRoutes;


