import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../../client/wp-client.js";
import type { ToolRegistry } from "../registry.js";
import { handleWpError, jsonResult } from "../shared.js";

export function registerThemesTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  server.registerTool(
    "wp_themes_list",
    {
      description: "List installed WordPress themes",
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult(await client.request("/wp/v2/themes"));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_themes_list");

  server.registerTool(
    "wp_themes_activate",
    {
      description: "Activate a WordPress theme by its stylesheet name",
      inputSchema: {
        stylesheet: z.string().describe("Theme stylesheet identifier (e.g. 'twentytwentyfour')"),
      },
    },
    async ({ stylesheet }) => {
      try {
        return jsonResult(await client.request(`/wp/v2/themes/${stylesheet}`, {
          method: "PUT",
          body: { status: "active" },
        }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_themes_activate");
}
