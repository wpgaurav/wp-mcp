import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../../client/wp-client.js";
import type { ToolRegistry } from "../registry.js";
import { handleWpError, jsonResult } from "../shared.js";

export function registerPluginsTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  server.registerTool(
    "wp_plugins_list",
    {
      description: "List installed WordPress plugins with their status",
      inputSchema: {
        status: z.enum(["active", "inactive"]).optional().describe("Filter by plugin status"),
      },
    },
    async (args) => {
      try {
        return jsonResult(await client.request("/wp/v2/plugins", { params: args as Record<string, unknown> }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_plugins_list");

  server.registerTool(
    "wp_plugins_get",
    {
      description: "Get details of a specific plugin. Use folder/file format (e.g. 'akismet/akismet')",
      inputSchema: {
        plugin: z.string().describe("Plugin identifier in folder/file format (e.g. 'akismet/akismet')"),
      },
    },
    async ({ plugin }) => {
      try {
        return jsonResult(await client.request(`/wp/v2/plugins/${encodeURIComponent(plugin)}`));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_plugins_get");

  server.registerTool(
    "wp_plugins_activate",
    {
      description: "Activate a WordPress plugin",
      inputSchema: {
        plugin: z.string().describe("Plugin identifier in folder/file format"),
      },
    },
    async ({ plugin }) => {
      try {
        return jsonResult(await client.request(`/wp/v2/plugins/${encodeURIComponent(plugin)}`, {
          method: "PUT",
          body: { status: "active" },
        }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_plugins_activate");

  server.registerTool(
    "wp_plugins_deactivate",
    {
      description: "Deactivate a WordPress plugin",
      inputSchema: {
        plugin: z.string().describe("Plugin identifier in folder/file format"),
      },
    },
    async ({ plugin }) => {
      try {
        return jsonResult(await client.request(`/wp/v2/plugins/${encodeURIComponent(plugin)}`, {
          method: "PUT",
          body: { status: "inactive" },
        }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_plugins_deactivate");
}
