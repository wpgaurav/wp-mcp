import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WpClient } from "./client/wp-client.js";
import type { WpMcpConfig } from "./config.js";
import { registerAllCoreTools } from "./tools/index.js";
import { ToolRegistry } from "./tools/registry.js";
import { runDiscovery } from "./discovery/engine.js";

export interface WpMcpServerResult {
  server: McpServer;
  client: WpClient;
  registry: ToolRegistry;
}

export async function createWpMcpServer(config: WpMcpConfig): Promise<WpMcpServerResult> {
  const server = new McpServer(
    { name: "wp-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  const client = new WpClient(config);
  const registry = new ToolRegistry();

  registerAllCoreTools(server, client, registry);

  if (config.discover) {
    try {
      await runDiscovery(server, client, registry, config.maxTools);
    } catch (err) {
      console.error("Auto-discovery failed (non-fatal):", (err as Error).message);
    }
  }

  return { server, client, registry };
}
