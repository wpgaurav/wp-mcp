import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../../client/wp-client.js";
import type { ToolRegistry } from "../registry.js";
import { handleWpError, jsonResult } from "../shared.js";

export function registerSiteHealthTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  server.registerTool(
    "wp_site_health",
    {
      description: "Get WordPress site health status and test results",
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult(await client.request("/wp-site-health/v1/tests/background-updates"));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_site_health");
}
