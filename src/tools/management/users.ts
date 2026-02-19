import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../../client/wp-client.js";
import type { ToolRegistry } from "../registry.js";
import { handleWpError, paginatedResult, jsonResult } from "../shared.js";

export function registerUsersTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  server.registerTool(
    "wp_users_list",
    {
      description: "List WordPress users",
      inputSchema: {
        per_page: z.number().int().min(1).max(100).default(10).describe("Users per page"),
        page: z.number().int().min(1).default(1).describe("Page number"),
        search: z.string().optional().describe("Search term"),
        roles: z.string().optional().describe("Comma-separated roles to filter by"),
        orderby: z.enum(["id", "name", "slug", "registered_date", "email"]).optional().describe("Sort field"),
        order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
      },
    },
    async (args) => {
      try {
        const result = await client.requestPaginated("/wp/v2/users", { params: args as Record<string, unknown> });
        return paginatedResult(result.data, result.total, result.totalPages);
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_users_list");

  server.registerTool(
    "wp_users_get",
    {
      description: "Get a WordPress user by ID",
      inputSchema: { id: z.number().int().describe("User ID") },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.request(`/wp/v2/users/${id}`));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_users_get");

  server.registerTool(
    "wp_users_create",
    {
      description: "Create a new WordPress user",
      inputSchema: {
        username: z.string().describe("Username (login name)"),
        email: z.string().email().describe("User email"),
        password: z.string().describe("User password"),
        name: z.string().optional().describe("Display name"),
        first_name: z.string().optional().describe("First name"),
        last_name: z.string().optional().describe("Last name"),
        roles: z.array(z.string()).optional().describe("User roles"),
      },
    },
    async (args) => {
      try {
        return jsonResult(await client.request("/wp/v2/users", { method: "POST", body: args as Record<string, unknown> }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_users_create");

  server.registerTool(
    "wp_users_me",
    {
      description: "Get the currently authenticated WordPress user",
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult(await client.request("/wp/v2/users/me"));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_users_me");
}
