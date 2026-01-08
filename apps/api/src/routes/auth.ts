import { FastifyPluginAsync } from "fastify";
import { prisma } from "../config/database.js";
import { LoginSchema, RegisterSchema } from "@coordi/shared";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register
  fastify.post("/register", async (request, reply) => {
    try {
      const body = RegisterSchema.parse(request.body);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        return reply.code(400).send({ error: "User already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(body.password, 10);

      // Create organization and user
      const organization = await prisma.organization.create({
        data: {
          name: body.organizationName,
          users: {
            create: {
              email: body.email,
              passwordHash,
            },
          },
          agentProfile: {
            create: {}, // Default values
          },
          businessProfile: {
            create: {
              companyName: body.organizationName,
            },
          },
          integrations: {
            create: {},
          },
        },
        include: {
          users: true,
        },
      });

      const user = organization.users[0];

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, organizationId: organization.id },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return { token, user: { id: user.id, email: user.email } };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Registration failed" });
    }
  });

  // Login
  fastify.post("/login", async (request, reply) => {
    try {
      const body = LoginSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email: body.email },
        include: { organization: true },
      });

      if (!user) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(body.password, user.passwordHash);

      if (!validPassword) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.id, organizationId: user.organizationId },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return { token, user: { id: user.id, email: user.email } };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Login failed" });
    }
  });
};

export default authRoutes;

