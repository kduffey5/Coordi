import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

export interface AuthenticatedRequest extends FastifyRequest {
  userId?: string;
  organizationId?: string;
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; organizationId: string };

    (request as AuthenticatedRequest).userId = decoded.userId;
    (request as AuthenticatedRequest).organizationId = decoded.organizationId;
  } catch (error) {
    return reply.code(401).send({ error: "Invalid token" });
  }
}


