import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../../client/wp-client.js";
import type { ToolRegistry } from "../registry.js";
import { handleWpError, paginatedResult, jsonResult } from "../shared.js";

export function registerPagesTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  server.registerTool(
    "wp_pages_list",
    {
      description: "List WordPress pages with filtering and pagination",
      inputSchema: {
        per_page: z.number().int().min(1).max(100).default(10).describe("Pages per page"),
        page: z.number().int().min(1).default(1).describe("Page number"),
        search: z.string().optional().describe("Search term"),
        status: z.enum(["publish", "draft", "pending", "private", "trash", "any"]).optional().describe("Page status"),
        parent: z.number().int().optional().describe("Parent page ID"),
        orderby: z.enum(["date", "id", "title", "slug", "modified", "menu_order"]).optional().describe("Sort field"),
        order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
      },
    },
    async (args) => {
      try {
        const result = await client.requestPaginated("/wp/v2/pages", { params: args as Record<string, unknown> });
        return paginatedResult(result.data, result.total, result.totalPages);
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_pages_list");

  server.registerTool(
    "wp_pages_get",
    {
      description: "Get a single WordPress page by ID",
      inputSchema: { id: z.number().int().describe("Page ID") },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.request(`/wp/v2/pages/${id}`));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_pages_get");

  server.registerTool(
    "wp_pages_create",
    {
      description: "Create a new WordPress page",
      inputSchema: {
        title: z.string().describe("Page title"),
        content: z.string().optional().describe("Page content (HTML)"),
        excerpt: z.string().optional().describe("Page excerpt"),
        status: z.enum(["publish", "draft", "pending", "private"]).default("draft").describe("Page status"),
        parent: z.number().int().optional().describe("Parent page ID"),
        menu_order: z.number().int().optional().describe("Menu order"),
        featured_media: z.number().int().optional().describe("Featured image media ID"),
        slug: z.string().optional().describe("Page slug"),
        template: z.string().optional().describe("Page template file"),
      },
    },
    async (args) => {
      try {
        return jsonResult(await client.request("/wp/v2/pages", { method: "POST", body: args as Record<string, unknown> }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_pages_create");

  server.registerTool(
    "wp_pages_update",
    {
      description: "Update an existing WordPress page",
      inputSchema: {
        id: z.number().int().describe("Page ID"),
        title: z.string().optional().describe("Page title"),
        content: z.string().optional().describe("Page content (HTML)"),
        excerpt: z.string().optional().describe("Page excerpt"),
        status: z.enum(["publish", "draft", "pending", "private"]).optional().describe("Page status"),
        parent: z.number().int().optional().describe("Parent page ID"),
        menu_order: z.number().int().optional().describe("Menu order"),
        featured_media: z.number().int().optional().describe("Featured image media ID"),
        slug: z.string().optional().describe("Page slug"),
        template: z.string().optional().describe("Page template file"),
      },
    },
    async ({ id, ...body }) => {
      try {
        return jsonResult(await client.request(`/wp/v2/pages/${id}`, { method: "PUT", body }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_pages_update");

  server.registerTool(
    "wp_pages_delete",
    {
      description: "Delete a WordPress page (moves to trash by default)",
      inputSchema: {
        id: z.number().int().describe("Page ID"),
        force: z.boolean().default(false).describe("Bypass trash and permanently delete"),
      },
    },
    async ({ id, force }) => {
      try {
        return jsonResult(await client.request(`/wp/v2/pages/${id}`, { method: "DELETE", params: { force } }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_pages_delete");
}
