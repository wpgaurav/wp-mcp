import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../../client/wp-client.js";
import type { ToolRegistry } from "../registry.js";
import { handleWpError, paginatedResult, jsonResult } from "../shared.js";

export function registerCommentsTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  server.registerTool(
    "wp_comments_list",
    {
      description: "List WordPress comments with filtering",
      inputSchema: {
        per_page: z.number().int().min(1).max(100).default(10).describe("Comments per page"),
        page: z.number().int().min(1).default(1).describe("Page number"),
        post: z.number().int().optional().describe("Limit to comments on a specific post ID"),
        status: z.enum(["approve", "hold", "spam", "trash"]).optional().describe("Comment status"),
        search: z.string().optional().describe("Search term"),
        orderby: z.enum(["date", "id", "parent"]).optional().describe("Sort field"),
        order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
      },
    },
    async (args) => {
      try {
        const result = await client.requestPaginated("/wp/v2/comments", { params: args as Record<string, unknown> });
        return paginatedResult(result.data, result.total, result.totalPages);
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_comments_list");

  server.registerTool(
    "wp_comments_create",
    {
      description: "Create a new comment on a post",
      inputSchema: {
        post: z.number().int().describe("Post ID to comment on"),
        content: z.string().describe("Comment content"),
        author_name: z.string().optional().describe("Comment author name (for non-logged-in)"),
        author_email: z.string().optional().describe("Comment author email"),
        parent: z.number().int().optional().describe("Parent comment ID (for replies)"),
        status: z.enum(["approve", "hold"]).optional().describe("Comment status"),
      },
    },
    async (args) => {
      try {
        return jsonResult(await client.request("/wp/v2/comments", { method: "POST", body: args as Record<string, unknown> }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_comments_create");
}
