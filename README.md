# wp-mcp

A TypeScript MCP server that exposes any WordPress site's REST API as MCP tools. Hand-crafted tools for core endpoints plus **auto-discovery of custom plugin endpoints** (WooCommerce, ACF, Yoast, any plugin).

## Features

- **37 core tools** for posts, pages, media, categories, tags, comments, plugins, themes, users, settings, menus, search, and site health
- **Auto-discovery engine** that scans `/wp-json/` and generates tools for any plugin's REST API endpoints
- **Both transports**: stdio (default for Claude Code/Desktop) and HTTP (StreamableHTTP)
- **Re-scan on demand** via `wp_discover_routes` after installing new plugins
- Single site, Basic Auth via Application Passwords

## Prerequisites

- Node.js 18+
- A WordPress site with REST API enabled
- An [Application Password](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/) for authentication

## Quick Start

```bash
npx @wpgaurav/wp-mcp setup
```

This interactive wizard will:
1. Ask for your WordPress URL, username, and Application Password
2. Test the connection
3. Write the config to Claude Desktop and/or Claude Code automatically

That's it. Restart Claude and your WordPress tools are ready.

## Manual Installation

```bash
# Run directly with npx
npx @wpgaurav/wp-mcp

# Or install globally
npm install -g @wpgaurav/wp-mcp
```

## Configuration

Set environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WP_URL` | Yes | — | WordPress site URL (no trailing slash) |
| `WP_USERNAME` | Yes | — | WordPress username |
| `WP_APP_PASSWORD` | Yes | — | Application Password |
| `WP_MCP_TRANSPORT` | No | `stdio` | `stdio` or `http` |
| `WP_MCP_PORT` | No | `3000` | HTTP transport port |
| `WP_MCP_HOST` | No | `127.0.0.1` | HTTP transport bind address |
| `WP_MCP_DISCOVER` | No | `true` | Auto-discover custom endpoints |
| `WP_MCP_MAX_TOOLS` | No | `128` | Maximum total tools (core + discovered) |

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "npx",
      "args": ["@wpgaurav/wp-mcp"],
      "env": {
        "WP_URL": "https://example.com",
        "WP_USERNAME": "admin",
        "WP_APP_PASSWORD": "xxxx xxxx xxxx xxxx"
      }
    }
  }
}
```

### Claude Code

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "npx",
      "args": ["@wpgaurav/wp-mcp"],
      "env": {
        "WP_URL": "https://example.com",
        "WP_USERNAME": "admin",
        "WP_APP_PASSWORD": "xxxx xxxx xxxx xxxx"
      }
    }
  }
}
```

### HTTP Transport

```bash
WP_URL=https://example.com \
WP_USERNAME=admin \
WP_APP_PASSWORD="xxxx xxxx xxxx xxxx" \
WP_MCP_TRANSPORT=http \
npx @wpgaurav/wp-mcp
```

The server listens on `http://127.0.0.1:3000/mcp` with StreamableHTTP.

## Core Tools

### Content (Tier 1)

| Tool | Description |
|------|-------------|
| `wp_posts_list` | List posts with filtering and pagination |
| `wp_posts_get` | Get a single post by ID |
| `wp_posts_create` | Create a new post |
| `wp_posts_update` | Update an existing post |
| `wp_posts_delete` | Delete a post |
| `wp_pages_list` | List pages |
| `wp_pages_get` | Get a single page by ID |
| `wp_pages_create` | Create a new page |
| `wp_pages_update` | Update an existing page |
| `wp_pages_delete` | Delete a page |
| `wp_media_list` | List media library items |
| `wp_media_get` | Get a media item by ID |
| `wp_media_upload` | Upload media from a URL |
| `wp_media_delete` | Delete a media item |
| `wp_categories_list` | List categories |
| `wp_categories_create` | Create a category |
| `wp_tags_list` | List tags |
| `wp_tags_create` | Create a tag |
| `wp_comments_list` | List comments |
| `wp_comments_create` | Create a comment |

### Management (Tier 2)

| Tool | Description |
|------|-------------|
| `wp_plugins_list` | List installed plugins |
| `wp_plugins_get` | Get plugin details |
| `wp_plugins_activate` | Activate a plugin |
| `wp_plugins_deactivate` | Deactivate a plugin |
| `wp_themes_list` | List installed themes |
| `wp_themes_activate` | Activate a theme |
| `wp_users_list` | List users |
| `wp_users_get` | Get a user by ID |
| `wp_users_create` | Create a new user |
| `wp_users_me` | Get the authenticated user |
| `wp_settings_get` | Get site settings |
| `wp_settings_update` | Update site settings |

### Advanced (Tier 3)

| Tool | Description |
|------|-------------|
| `wp_menus_list` | List navigation menus |
| `wp_menu_items_list` | List menu items |
| `wp_search` | Search across all content |
| `wp_site_health` | Get site health status |

### Meta

| Tool | Description |
|------|-------------|
| `wp_discover_routes` | Re-scan the site for new REST API endpoints |

## Auto-Discovery

On startup (when `WP_MCP_DISCOVER=true`), the server fetches `/wp-json/` and automatically generates MCP tools for every custom plugin endpoint it finds. Core `wp/v2` routes are skipped since they're already covered by hand-crafted tools.

### Example: WooCommerce

If WooCommerce is installed, these tools appear automatically:

| Tool | Endpoint |
|------|----------|
| `wc_products_list` | GET `/wc/v3/products` |
| `wc_products_get` | GET `/wc/v3/products/{id}` |
| `wc_products_create` | POST `/wc/v3/products` |
| `wc_orders_list` | GET `/wc/v3/orders` |
| `wc_orders_notes_list` | GET `/wc/v3/orders/{id}/notes` |

### Naming Convention

```
{namespace_prefix}_{resource}_{action}

GET  /wc/v3/products          -> wc_products_list
GET  /wc/v3/products/{id}     -> wc_products_get
POST /wc/v3/products          -> wc_products_create
GET  /acf/v1/posts/{id}       -> acf_posts_get
GET  /yoast/v1/indexables     -> yoast_indexables_list
```

### Re-scanning After Plugin Install

Use the `wp_discover_routes` tool to re-scan the site after installing or activating a new plugin:

```
wp_discover_routes({ namespace_filter: "wc/v3" })
```

## Development

```bash
git clone https://github.com/wpgaurav/wp-mcp.git
cd wp-mcp
npm install
npm run typecheck
npm test
npm run build
```

## Library Usage

```typescript
import { createWpMcpServer, loadConfig } from "@wpgaurav/wp-mcp";

const config = loadConfig({
  wpUrl: "https://example.com",
  wpUsername: "admin",
  wpAppPassword: "xxxx xxxx xxxx xxxx",
});

const { server, client, registry } = await createWpMcpServer(config);
```

## License

MIT
