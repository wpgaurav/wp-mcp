import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../../client/wp-client.js";
import type { ToolRegistry } from "../registry.js";
import { handleWpError, paginatedResult, jsonResult } from "../shared.js";

export function registerCategoriesTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  server.registerTool(
    "wp_categories_list",
    {
      description: "List WordPress categories",
      inputSchema: {
        per_page: z.number().int().min(1).max(100).default(10).describe("Categories per page"),
        page: z.number().int().min(1).default(1).describe("Page number"),
        search: z.string().optional().describe("Search term"),
        parent: z.number().int().optional().describe("Parent category ID"),
        orderby: z.enum(["id", "name", "slug", "count"]).optional().describe("Sort field"),
        order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
        hide_empty: z.boolean().optional().describe("Hide categories with no posts"),
      },
    },
    async (args) => {
      try {
        const result = await client.requestPaginated("/wp/v2/categories", { params: args as Record<string, unknown> });
        return paginatedResult(result.data, result.total, result.totalPages);
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_categories_list");

  server.registerTool(
    "wp_categories_create",
    {
      description: "Create a new WordPress category",
      inputSchema: {
        name: z.string().describe("Category name"),
        slug: z.string().optional().describe("Category slug"),
        description: z.string().optional().describe("Category description"),
        parent: z.number().int().optional().describe("Parent category ID"),
      },
    },
    async (args) => {
      try {
        return jsonResult(await client.request("/wp/v2/categories", { method: "POST", body: args as Record<string, unknown> }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_categories_create");
}
