import express from "express";
import { randomUUID } from "node:crypto";
import type { WpMcpServerFactory } from "../server.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

export async function startHttpTransport(
  factory: WpMcpServerFactory,
  host: string,
  port: number,
): Promise<void> {
  const app = express();

  // --- Streamable HTTP transport (modern clients) ---

  const httpTransports = new Map<string, StreamableHTTPServerTransport>();

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && httpTransports.has(sessionId)) {
      const transport = httpTransports.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        httpTransports.set(id, transport);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        httpTransports.delete(transport.sessionId);
      }
    };

    const { server } = factory.create();
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !httpTransports.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    const transport = httpTransports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !httpTransports.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    const transport = httpTransports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // --- Legacy SSE transport (Claude Desktop / Cowork) ---

  const sseSessions = new Map<string, SSEServerTransport>();

  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    sseSessions.set(transport.sessionId, transport);

    transport.onclose = () => {
      sseSessions.delete(transport.sessionId);
    };

    const { server } = factory.create();
    await server.connect(transport);
  });

  app.post("/messages", async (req, res) => {
    const sessionId = req.query["sessionId"] as string | undefined;
    if (!sessionId || !sseSessions.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing sessionId" });
      return;
    }
    const transport = sseSessions.get(sessionId)!;
    await transport.handlePostMessage(req, res);
  });

  // --- Start server ---

  await new Promise<void>((resolve) => {
    app.listen(port, host, () => {
      console.error(`wp-mcp HTTP server listening on http://${host}:${port}`);
      console.error(`  Streamable HTTP: POST http://${host}:${port}/mcp`);
      console.error(`  Legacy SSE:      GET  http://${host}:${port}/sse`);
      resolve();
    });
  });
}
