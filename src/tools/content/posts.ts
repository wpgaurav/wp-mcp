import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../../client/wp-client.js";
import type { ToolRegistry } from "../registry.js";
import { handleWpError } from "../shared.js";

export function registerPostsTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  server.registerTool(
    "wp_posts_list",
    {
      description: "List WordPress posts with filtering and pagination",
      inputSchema: {
        per_page: z.number().int().min(1).max(100).default(10).describe("Posts per page"),
        page: z.number().int().min(1).default(1).describe("Page number"),
        search: z.string().optional().describe("Search term"),
        status: z.enum(["publish", "draft", "pending", "private", "trash", "any"]).optional().describe("Post status"),
        categories: z.string().optional().describe("Comma-separated category IDs"),
        tags: z.string().optional().describe("Comma-separated tag IDs"),
        orderby: z.enum(["date", "id", "title", "slug", "modified"]).optional().describe("Sort field"),
        order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
      },
    },
    async (args) => {
      try {
        const result = await client.requestPaginated("/wp/v2/posts", { params: args as Record<string, unknown> });
        return { content: [{ type: "text", text: JSON.stringify({ posts: result.data, total: result.total, totalPages: result.totalPages }, null, 2) }] };
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_posts_list");

  server.registerTool(
    "wp_posts_get",
    {
      description: "Get a single WordPress post by ID",
      inputSchema: {
        id: z.number().int().describe("Post ID"),
      },
    },
    async ({ id }) => {
      try {
        const post = await client.request(`/wp/v2/posts/${id}`);
        return { content: [{ type: "text", text: JSON.stringify(post, null, 2) }] };
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_posts_get");

  server.registerTool(
    "wp_posts_create",
    {
      description: "Create a new WordPress post",
      inputSchema: {
        title: z.string().describe("Post title"),
        content: z.string().optional().describe("Post content (HTML)"),
        excerpt: z.string().optional().describe("Post excerpt"),
        status: z.enum(["publish", "draft", "pending", "private"]).default("draft").describe("Post status"),
        categories: z.array(z.number().int()).optional().describe("Category IDs"),
        tags: z.array(z.number().int()).optional().describe("Tag IDs"),
        featured_media: z.number().int().optional().describe("Featured image media ID"),
        slug: z.string().optional().describe("Post slug"),
        format: z.enum(["standard", "aside", "chat", "gallery", "link", "image", "quote", "status", "video", "audio"]).optional().describe("Post format"),
      },
    },
    async (args) => {
      try {
        const post = await client.request("/wp/v2/posts", { method: "POST", body: args as Record<string, unknown> });
        return { content: [{ type: "text", text: JSON.stringify(post, null, 2) }] };
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_posts_create");

  server.registerTool(
    "wp_posts_update",
    {
      description: "Update an existing WordPress post",
      inputSchema: {
        id: z.number().int().describe("Post ID"),
        title: z.string().optional().describe("Post title"),
        content: z.string().optional().describe("Post content (HTML)"),
        excerpt: z.string().optional().describe("Post excerpt"),
        status: z.enum(["publish", "draft", "pending", "private"]).optional().describe("Post status"),
        categories: z.array(z.number().int()).optional().describe("Category IDs"),
        tags: z.array(z.number().int()).optional().describe("Tag IDs"),
        featured_media: z.number().int().optional().describe("Featured image media ID"),
        slug: z.string().optional().describe("Post slug"),
      },
    },
    async ({ id, ...body }) => {
      try {
        const post = await client.request(`/wp/v2/posts/${id}`, { method: "PUT", body });
        return { content: [{ type: "text", text: JSON.stringify(post, null, 2) }] };
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_posts_update");

  server.registerTool(
    "wp_posts_delete",
    {
      description: "Delete a WordPress post (moves to trash by default)",
      inputSchema: {
        id: z.number().int().describe("Post ID"),
        force: z.boolean().default(false).describe("Bypass trash and permanently delete"),
      },
    },
    async ({ id, force }) => {
      try {
        const result = await client.request(`/wp/v2/posts/${id}`, {
          method: "DELETE",
          params: { force },
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_posts_delete");
}
