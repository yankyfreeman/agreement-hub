import { createMcpHandler, getPublicOrigin } from "mcp-handler";
import { INSTRUCTIONS, registerTools } from "@/lib/mcp";
import { callerId, LIMITS, take } from "@/lib/rate-limit";

// The MCP server developers connect their AI assistant to. It is stateless, so
// a handler is built per request with that request's origin (for the links it
// hands out) and caller (for rate limits).
async function handler(request: Request) {
  const caller = callerId(request.headers);
  if (!(await take(`mcp:${caller}`, LIMITS.mcp))) {
    return Response.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  const handle = createMcpHandler(
    (server) => registerTools(server, { origin: getPublicOrigin(request), caller }),
    { serverInfo: { name: "ag-hub", version: "1.0.0" }, instructions: INSTRUCTIONS },
  );
  return handle(request);
}

export { handler as GET, handler as POST, handler as DELETE };
