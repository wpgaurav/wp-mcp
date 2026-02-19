import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../../client/wp-client.js";
import type { ToolRegistry } from "../registry.js";
import { handleWpError, paginatedResult } from "../shared.js";

export function registerSearchTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  server.registerTool(
    "wp_search",
    {
      description: "Search across all WordPress content (posts, pages, categories, etc.)",
      inputSchema: {
        search: z.string().describe("Search query"),
        type: z.enum(["post", "term", "post-format"]).optional().describe("Limit to content type"),
        subtype: z.string().optional().describe("Limit to subtype (e.g. 'post', 'page', 'category')"),
        per_page: z.number().int().min(1).max(100).default(10).describe("Results per page"),
        page: z.number().int().min(1).default(1).describe("Page number"),
      },
    },
    async (args) => {
      try {
        const result = await client.requestPaginated("/wp/v2/search", { params: args as Record<string, unknown> });
        return paginatedResult(result.data, result.total, result.totalPages);
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_search");
}
