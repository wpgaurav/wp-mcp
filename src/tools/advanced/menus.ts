import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../../client/wp-client.js";
import type { ToolRegistry } from "../registry.js";
import { handleWpError, jsonResult } from "../shared.js";

export function registerMenusTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  server.registerTool(
    "wp_menus_list",
    {
      description: "List WordPress navigation menus",
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult(await client.request("/wp/v2/menus"));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_menus_list");

  server.registerTool(
    "wp_menu_items_list",
    {
      description: "List items in a WordPress navigation menu",
      inputSchema: {
        menus: z.number().int().optional().describe("Menu ID to filter by"),
        per_page: z.number().int().min(1).max(100).default(100).describe("Items per page"),
        page: z.number().int().min(1).default(1).describe("Page number"),
      },
    },
    async (args) => {
      try {
        return jsonResult(await client.request("/wp/v2/menu-items", { params: args as Record<string, unknown> }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_menu_items_list");
}
