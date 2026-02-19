import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../../client/wp-client.js";
import type { ToolRegistry } from "../registry.js";
import { handleWpError, paginatedResult, jsonResult } from "../shared.js";

export function registerTagsTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  server.registerTool(
    "wp_tags_list",
    {
      description: "List WordPress tags",
      inputSchema: {
        per_page: z.number().int().min(1).max(100).default(10).describe("Tags per page"),
        page: z.number().int().min(1).default(1).describe("Page number"),
        search: z.string().optional().describe("Search term"),
        orderby: z.enum(["id", "name", "slug", "count"]).optional().describe("Sort field"),
        order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
        hide_empty: z.boolean().optional().describe("Hide tags with no posts"),
      },
    },
    async (args) => {
      try {
        const result = await client.requestPaginated("/wp/v2/tags", { params: args as Record<string, unknown> });
        return paginatedResult(result.data, result.total, result.totalPages);
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_tags_list");

  server.registerTool(
    "wp_tags_create",
    {
      description: "Create a new WordPress tag",
      inputSchema: {
        name: z.string().describe("Tag name"),
        slug: z.string().optional().describe("Tag slug"),
        description: z.string().optional().describe("Tag description"),
      },
    },
    async (args) => {
      try {
        return jsonResult(await client.request("/wp/v2/tags", { method: "POST", body: args as Record<string, unknown> }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_tags_create");
}
