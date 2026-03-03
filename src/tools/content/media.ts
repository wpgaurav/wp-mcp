import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../../client/wp-client.js";
import type { ToolRegistry } from "../registry.js";
import { handleWpError, paginatedResult, jsonResult } from "../shared.js";

export function registerMediaTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  server.registerTool(
    "wp_media_list",
    {
      description: "List media items in the WordPress media library",
      inputSchema: {
        per_page: z.number().int().min(1).max(100).default(10).describe("Items per page"),
        page: z.number().int().min(1).default(1).describe("Page number"),
        search: z.string().optional().describe("Search term"),
        media_type: z.enum(["image", "video", "audio", "application"]).optional().describe("Filter by media type"),
        mime_type: z.string().optional().describe("Filter by MIME type (e.g. image/jpeg)"),
        orderby: z.enum(["date", "id", "title", "slug"]).optional().describe("Sort field"),
        order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
      },
    },
    async (args) => {
      try {
        const result = await client.requestPaginated("/wp/v2/media", { params: args as Record<string, unknown> });
        return paginatedResult(result.data, result.total, result.totalPages);
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_media_list");

  server.registerTool(
    "wp_media_get",
    {
      description: "Get a single media item by ID",
      inputSchema: { id: z.number().int().describe("Media ID") },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.request(`/wp/v2/media/${id}`));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_media_get");

  server.registerTool(
    "wp_media_upload",
    {
      description: "Upload a media file to WordPress from a URL. Downloads the file and uploads it to the media library.",
      inputSchema: {
        url: z.string().url().describe("URL of the file to upload"),
        title: z.string().optional().describe("Media title"),
        alt_text: z.string().optional().describe("Alt text for the media"),
        caption: z.string().optional().describe("Media caption"),
        filename: z.string().optional().describe("Override filename (include extension)"),
      },
    },
    async ({ url, title, alt_text, caption, filename }) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          return { content: [{ type: "text" as const, text: `Failed to download file from ${url}: ${response.status}` }], isError: true as const };
        }

        const contentType = response.headers.get("content-type") ?? "application/octet-stream";
        const buffer = Buffer.from(await response.arrayBuffer());
        const resolvedFilename = filename ?? url.split("/").pop() ?? "upload";

        const uploadResult = await client.request("/wp/v2/media", {
          method: "POST",
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${resolvedFilename}"`,
          },
          rawBody: buffer,
        });

        if (title || alt_text || caption) {
          const mediaId = (uploadResult as Record<string, unknown>)["id"];
          if (typeof mediaId !== "number") {
            return { content: [{ type: "text" as const, text: "Upload succeeded but response missing media ID. Cannot update metadata." }], isError: true as const };
          }
          const updateBody: Record<string, unknown> = {};
          if (title) updateBody["title"] = title;
          if (alt_text) updateBody["alt_text"] = alt_text;
          if (caption) updateBody["caption"] = caption;
          return jsonResult(await client.request(`/wp/v2/media/${mediaId}`, { method: "PUT", body: updateBody }));
        }

        return jsonResult(uploadResult);
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_media_upload");

  server.registerTool(
    "wp_media_delete",
    {
      description: "Permanently delete a media item",
      inputSchema: {
        id: z.number().int().describe("Media ID"),
        force: z.boolean().default(true).describe("Must be true to delete media"),
      },
    },
    async ({ id, force }) => {
      try {
        return jsonResult(await client.request(`/wp/v2/media/${id}`, { method: "DELETE", params: { force } }));
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_media_delete");
}
