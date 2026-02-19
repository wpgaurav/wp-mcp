import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../client/wp-client.js";
import type { ToolRegistry } from "./registry.js";
import { registerPostsTools } from "./content/posts.js";
import { registerPagesTools } from "./content/pages.js";
import { registerMediaTools } from "./content/media.js";
import { registerCategoriesTools } from "./content/categories.js";
import { registerTagsTools } from "./content/tags.js";
import { registerCommentsTools } from "./content/comments.js";
import { registerPluginsTools } from "./management/plugins.js";
import { registerThemesTools } from "./management/themes.js";
import { registerUsersTools } from "./management/users.js";
import { registerSettingsTools } from "./management/settings.js";
import { registerMenusTools } from "./advanced/menus.js";
import { registerSearchTools } from "./advanced/search.js";
import { registerSiteHealthTools } from "./advanced/site-health.js";

export function registerAllCoreTools(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  registerPostsTools(server, client, registry);
  registerPagesTools(server, client, registry);
  registerMediaTools(server, client, registry);
  registerCategoriesTools(server, client, registry);
  registerTagsTools(server, client, registry);
  registerCommentsTools(server, client, registry);
  registerPluginsTools(server, client, registry);
  registerThemesTools(server, client, registry);
  registerUsersTools(server, client, registry);
  registerSettingsTools(server, client, registry);
  registerMenusTools(server, client, registry);
  registerSearchTools(server, client, registry);
  registerSiteHealthTools(server, client, registry);
}
