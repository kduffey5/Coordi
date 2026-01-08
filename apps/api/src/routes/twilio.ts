import { FastifyPluginAsync } from "fastify";
import { prisma } from "../config/database.js";

const twilioRoutes: FastifyPluginAsync = async (fastify) => {
  // Twilio Voice webhook - returns TwiML to start media stream
  fastify.post("/voice", async (request, reply) => {
    // Twilio sends form-urlencoded data, which is now parsed by @fastify/formbody
    const body = request.body as Record<string, string> | undefined;
    
    // Extract call information
    const fromNumber = body?.From || "";
    const toNumber = body?.To || "";
    const callSid = body?.CallSid || "";

    fastify.log.info(`Incoming call: ${fromNumber} -> ${toNumber} (${callSid})`);
    
    // Determine the WebSocket URL for Twilio Media Streams
    // Priority: 1. Environment variable, 2. Construct from request, 3. Fallback
    let streamUrl = process.env.TWILIO_STREAM_URL;
    
    if (!streamUrl) {
      // Try to construct from the request URL (works on Render)
      // Check for Render's external URL first, then use request headers
      const renderUrl = process.env.RENDER_EXTERNAL_URL;
      if (renderUrl) {
        streamUrl = renderUrl.replace(/^https?/, "wss") + "/call";
      } else {
        // Use request headers to determine protocol and host
        const protocol = request.headers["x-forwarded-proto"] === "https" || 
                        request.headers.referer?.startsWith("https") ? "wss" : "ws";
        const host = request.headers.host || 
                     request.headers["x-forwarded-host"] || 
                     "localhost:3001";
        streamUrl = `${protocol}://${host}/call`;
      }
    }
    
    fastify.log.info(`Using WebSocket URL: ${streamUrl}`);
    
    // Build TwiML with custom parameters
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${streamUrl}">
      <Parameter name="From" value="${fromNumber}" />
      <Parameter name="To" value="${toNumber}" />
      <Parameter name="CallSid" value="${callSid}" />
    </Stream>
  </Connect>
</Response>`;

    reply.type("text/xml").send(twiml);
  });

  // Twilio Status Callback webhook
  fastify.post("/status", async (request, reply) => {
    const body = request.body as Record<string, string> | undefined;
    const callSid = body?.CallSid;
    const callStatus = body?.CallStatus;

    fastify.log.info(`Call status update: ${callSid} -> ${callStatus}`);

    // Update call record if exists
    if (callSid) {
      try {
        const call = await prisma.call.findUnique({
          where: { twilioCallSid: callSid },
        });

        if (call) {
          await prisma.call.update({
            where: { id: call.id },
            data: {
              // Map Twilio status to our outcome
              outcome: callStatus === "completed" ? call.outcome || "completed" : call.outcome,
              endTime: callStatus === "completed" ? new Date() : call.endTime,
            },
          });
        }
      } catch (error) {
        fastify.log.error({ err: error }, "Error updating call status");
      }
    }

    return { received: true };
  });
};

export default twilioRoutes;


