import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WpClient } from "../client/wp-client.js";
import type { ToolRegistry } from "../tools/registry.js";
import { handleWpError, jsonResult } from "../tools/shared.js";
import { shouldSkipNamespace } from "./naming.js";
import { registerDiscoveredTool, type DiscoveredRoute } from "./tool-generator.js";
import type { WpArgDefinition } from "./schema-mapper.js";

interface WpRouteEndpoint {
  methods: string[];
  args?: Record<string, WpArgDefinition>;
}

interface WpDiscoveryResponse {
  namespaces?: string[];
  routes?: Record<string, {
    namespace?: string;
    methods?: string[];
    endpoints?: WpRouteEndpoint[];
  }>;
}

export async function runDiscovery(
  server: McpServer,
  client: WpClient,
  registry: ToolRegistry,
): Promise<number> {
  const discovery = await client.fetchRawJson<WpDiscoveryResponse>("/");
  const routes = discovery.routes ?? {};
  let count = 0;

  for (const [routePath, routeInfo] of Object.entries(routes)) {
    const namespace = routeInfo.namespace ?? inferNamespace(routePath);
    if (!namespace || shouldSkipNamespace(namespace)) continue;

    const endpoints = routeInfo.endpoints ?? [];
    if (endpoints.length === 0 && routeInfo.methods) {
      for (const method of routeInfo.methods) {
        const discovered: DiscoveredRoute = {
          namespace,
          path: stripNamespaceFromPath(routePath, namespace),
          method: method.toUpperCase(),
          args: {},
        };
        if (registerDiscoveredTool(server, client, registry, discovered)) {
          count++;
        }
      }
      continue;
    }

    for (const endpoint of endpoints) {
      for (const method of endpoint.methods) {
        const discovered: DiscoveredRoute = {
          namespace,
          path: stripNamespaceFromPath(routePath, namespace),
          method: method.toUpperCase(),
          args: endpoint.args ?? {},
        };
        if (registerDiscoveredTool(server, client, registry, discovered)) {
          count++;
        }
      }
    }
  }

  registerDiscoverRoutesTool(server, client, registry);

  console.error(`Auto-discovery: registered ${count} tools from custom endpoints`);
  return count;
}

function registerDiscoverRoutesTool(server: McpServer, client: WpClient, registry: ToolRegistry): void {
  if (registry.has("wp_discover_routes")) return;

  server.registerTool(
    "wp_discover_routes",
    {
      description: "Re-scan the WordPress site for REST API endpoints. Useful after installing new plugins.",
      inputSchema: {
        namespace_filter: z.string().optional().describe("Only discover routes in this namespace (e.g. 'wc/v3')"),
      },
    },
    async ({ namespace_filter }) => {
      try {
        const discovery = await client.fetchRawJson<WpDiscoveryResponse>("/");
        const namespaces = discovery.namespaces ?? [];
        const routes = discovery.routes ?? {};

        if (namespace_filter) {
          let count = 0;
          for (const [routePath, routeInfo] of Object.entries(routes)) {
            const ns = routeInfo.namespace ?? inferNamespace(routePath);
            if (ns !== namespace_filter) continue;

            const endpoints = routeInfo.endpoints ?? [];
            for (const endpoint of endpoints) {
              for (const method of endpoint.methods) {
                const discovered: DiscoveredRoute = {
                  namespace: ns,
                  path: stripNamespaceFromPath(routePath, ns),
                  method: method.toUpperCase(),
                  args: endpoint.args ?? {},
                };
                if (registerDiscoveredTool(server, client, registry, discovered)) {
                  count++;
                }
              }
            }
          }
          return jsonResult({ message: `Discovered ${count} new tools in namespace ${namespace_filter}`, namespaces });
        }

        return jsonResult({
          namespaces,
          route_count: Object.keys(routes).length,
          registered_tools: registry.all(),
        });
      } catch (err) {
        return handleWpError(err);
      }
    },
  );
  registry.register("wp_discover_routes");
}

function inferNamespace(routePath: string): string | undefined {
  const clean = routePath.replace(/^\//, "");
  const parts = clean.split("/");
  if (parts.length >= 2 && /^v\d+/.test(parts[1]!)) {
    return `${parts[0]}/${parts[1]}`;
  }
  if (parts.length >= 1) {
    return parts[0];
  }
  return undefined;
}

function stripNamespaceFromPath(routePath: string, namespace: string): string {
  const prefix = `/${namespace}/`;
  if (routePath.startsWith(prefix)) {
    return routePath.slice(prefix.length);
  }
  const prefixNoSlash = `/${namespace}`;
  if (routePath === prefixNoSlash) {
    return "";
  }
  return routePath.replace(/^\//, "");
}
