import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WpClient } from "./client/wp-client.js";
import type { WpMcpConfig } from "./config.js";
import { registerAllCoreTools } from "./tools/index.js";
import { ToolRegistry } from "./tools/registry.js";
import { runDiscovery, runDiscoveryCollect, replayDiscoveredRoutes } from "./discovery/engine.js";
import type { DiscoveredRoute } from "./discovery/tool-generator.js";

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

export interface WpMcpServerFactory {
  create(): WpMcpServerResult;
}

export async function createWpMcpServerFactory(config: WpMcpConfig): Promise<WpMcpServerFactory> {
  const client = new WpClient(config);

  let cachedRoutes: DiscoveredRoute[] = [];
  if (config.discover) {
    try {
      cachedRoutes = await runDiscoveryCollect(client, config.maxTools);
      console.error(`Auto-discovery: cached ${cachedRoutes.length} routes`);
    } catch (err) {
      console.error("Auto-discovery failed (non-fatal):", (err as Error).message);
    }
  }

  return {
    create(): WpMcpServerResult {
      const server = new McpServer(
        { name: "wp-mcp", version: "0.1.0" },
        { capabilities: { tools: {} } },
      );
      const registry = new ToolRegistry();

      registerAllCoreTools(server, client, registry);
      replayDiscoveredRoutes(server, client, registry, cachedRoutes);

      return { server, client, registry };
    },
  };
}
