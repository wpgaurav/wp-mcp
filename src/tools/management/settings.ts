import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../../client/wp-client.js";
import type { ToolRegistry } from "../registry.js";
import { handleWpError, jsonResult } from "../shared.js";

export function registerSettingsTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  server.registerTool(
    "wp_settings_get",
    {
      description: "Get WordPress site settings (title, tagline, URL, timezone, date/time format, etc.)",
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult(await client.request("/wp/v2/settings"));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_settings_get");

  server.registerTool(
    "wp_settings_update",
    {
      description: "Update WordPress site settings",
      inputSchema: {
        title: z.string().optional().describe("Site title"),
        description: z.string().optional().describe("Site tagline"),
        timezone_string: z.string().optional().describe("Timezone (e.g. 'America/New_York')"),
        date_format: z.string().optional().describe("Date format string"),
        time_format: z.string().optional().describe("Time format string"),
        posts_per_page: z.number().int().optional().describe("Posts per page"),
        default_comment_status: z.enum(["open", "closed"]).optional().describe("Default comment status"),
      },
    },
    async (args) => {
      try {
        return jsonResult(await client.request("/wp/v2/settings", { method: "POST", body: args as Record<string, unknown> }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_settings_update");
}
