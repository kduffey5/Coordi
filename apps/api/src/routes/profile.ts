import { FastifyPluginAsync } from "fastify";
import { prisma } from "../config/database.js";
import { AgentProfileUpdateSchema, BusinessProfileUpdateSchema } from "@coordi/shared";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth middleware to all routes
  fastify.addHook("onRequest", authenticate);

  // Get agent profile
  fastify.get("/agent", async (request: AuthenticatedRequest) => {
    const organizationId = request.organizationId!;

    let profile = await prisma.agentProfile.findUnique({
      where: { organizationId },
    });

    if (!profile) {
      // Create default profile if it doesn't exist
      profile = await prisma.agentProfile.create({
        data: { organizationId },
      });
    }

    return profile;
  });

  // Update agent profile
  fastify.put("/agent", async (request: AuthenticatedRequest, reply) => {
    try {
      const organizationId = request.organizationId!;
      const body = AgentProfileUpdateSchema.parse(request.body);

      const profile = await prisma.agentProfile.upsert({
        where: { organizationId },
        update: body,
        create: { organizationId, ...body },
      });

      return profile;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({ error: "Invalid request" });
    }
  });

  // Get business profile
  fastify.get("/business", async (request: AuthenticatedRequest) => {
    const organizationId = request.organizationId!;

    let profile = await prisma.businessProfile.findUnique({
      where: { organizationId },
    });

    if (!profile) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      profile = await prisma.businessProfile.create({
        data: {
          organizationId,
          companyName: organization?.name || "My Business",
        },
      });
    }

    return profile;
  });

  // Update business profile
  fastify.put("/business", async (request: AuthenticatedRequest, reply) => {
    try {
      const organizationId = request.organizationId!;
      const body = BusinessProfileUpdateSchema.parse(request.body);

      const profile = await prisma.businessProfile.upsert({
        where: { organizationId },
        update: body,
        create: { organizationId, ...body },
      });

      return profile;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({ error: "Invalid request" });
    }
  });
};

export default profileRoutes;


