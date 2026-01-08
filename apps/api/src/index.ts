import Fastify from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import websocket from "@fastify/websocket";
import dotenv from "dotenv";
import { prisma } from "./config/database.js";

// Load environment variables
dotenv.config();

const fastify = Fastify({
  logger: true,
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
});

// Register formbody parser for Twilio webhooks (application/x-www-form-urlencoded)
await fastify.register(formbody);

await fastify.register(websocket);

// Root route - API information
fastify.get("/", async (request, reply) => {
  return {
    name: "Coordi API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      profile: "/api/profile",
      calls: "/api/calls",
      leads: "/api/leads",
      metrics: "/api/metrics",
      integrations: "/api/integrations",
      twilio: "/twilio",
      websocket: "/call"
    }
  };
});

// Health check
fastify.get("/health", async (request, reply) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Register routes
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import callRoutes from "./routes/calls.js";
import leadRoutes from "./routes/leads.js";
import metricsRoutes from "./routes/metrics.js";
import integrationRoutes from "./routes/integrations.js";
import twilioRoutes from "./routes/twilio.js";

fastify.register(authRoutes, { prefix: "/api/auth" });
fastify.register(profileRoutes, { prefix: "/api/profile" });
fastify.register(callRoutes, { prefix: "/api/calls" });
fastify.register(leadRoutes, { prefix: "/api/leads" });
fastify.register(metricsRoutes, { prefix: "/api/metrics" });
fastify.register(integrationRoutes, { prefix: "/api/integrations" });
fastify.register(twilioRoutes, { prefix: "/twilio" });

// WebSocket endpoint for Twilio Media Streams
import { TwilioStreamHandler } from "./twilio/streamHandler.js";

fastify.get("/call", { websocket: true }, (connection, req) => {
  // In @fastify/websocket v10, the handler receives the WebSocket directly as the first parameter
  // We can also access the request to get URL query parameters if needed
  try {
    // Log the request URL and query parameters - Twilio might include callSid here
    console.log("WebSocket connection request URL:", req.url);
    console.log("WebSocket query params:", req.query);
    
    // Pass request info to handler in case we need it
    new TwilioStreamHandler(connection, req);
  } catch (error: any) {
    console.error("Error creating TwilioStreamHandler:", error);
    // Try to close the connection if possible
    if (connection?.close) {
      connection.close();
    }
  }
});

const start = async () => {
  try {
    // Render sets PORT automatically, default to 3001 for local dev
    const port = Number(process.env.PORT) || 3001;
    // Use 0.0.0.0 to bind to all network interfaces (required for Render)
    const host = process.env.HOST || "0.0.0.0";
    
    await fastify.listen({ port, host });
    const serverUrl = process.env.RENDER_EXTERNAL_URL 
      ? process.env.RENDER_EXTERNAL_URL 
      : `http://${host}:${port}`;
    console.log(`🚀 Server listening on ${serverUrl}`);
    const wsProtocol = serverUrl.startsWith("https") ? "wss" : "ws";
    console.log(`📡 WebSocket endpoint: ${serverUrl.replace(/^https?/, wsProtocol)}/call`);
  } catch (err) {
    fastify.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
});

start();

