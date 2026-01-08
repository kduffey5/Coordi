import { FastifyPluginAsync } from "fastify";
import { prisma } from "../config/database.js";
import { IntegrationUpdateSchema } from "@coordi/shared";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";

const integrationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", authenticate);

  // Get integrations
  fastify.get("/", async (request: AuthenticatedRequest) => {
    const organizationId = request.organizationId!;

    let integration = await prisma.integration.findUnique({
      where: { organizationId },
    });

    if (!integration) {
      integration = await prisma.integration.create({
        data: { organizationId },
      });
    }

    return integration;
  });

  // Update integrations
  fastify.put("/", async (request: AuthenticatedRequest, reply) => {
    try {
      const organizationId = request.organizationId!;
      const body = IntegrationUpdateSchema.parse(request.body);

      const integration = await prisma.integration.upsert({
        where: { organizationId },
        update: body,
        create: { organizationId, ...body },
      });

      return integration;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({ error: "Invalid request" });
    }
  });
};

export default integrationRoutes;


