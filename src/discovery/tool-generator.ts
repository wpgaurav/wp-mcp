import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { WpClient } from "../client/wp-client.js";
import type { ToolRegistry } from "../tools/registry.js";
import { handleWpError, jsonResult } from "../tools/shared.js";
import { wpArgsToZodShape, type WpArgDefinition } from "./schema-mapper.js";
import { routeToToolName, extractPathParams } from "./naming.js";

export interface DiscoveredRoute {
  namespace: string;
  path: string;
  method: string;
  args: Record<string, WpArgDefinition>;
  description?: string;
}

export function registerDiscoveredTool(
  server: McpServer,
  client: WpClient,
  registry: ToolRegistry,
  route: DiscoveredRoute,
): boolean {
  const toolName = routeToToolName(route.namespace, route.path, route.method);

  if (registry.has(toolName)) {
    return false;
  }

  const pathParams = extractPathParams(route.path);

  const pathParamSchema: Record<string, z.ZodTypeAny> = {};
  for (const param of pathParams) {
    pathParamSchema[param] = z.union([z.string(), z.number()]).describe(`Path parameter: ${param}`);
  }

  const queryOrBodyArgs = { ...route.args };
  for (const param of pathParams) {
    delete queryOrBodyArgs[param];
  }

  const querySchema = wpArgsToZodShape(queryOrBodyArgs);
  const inputSchema = { ...pathParamSchema, ...querySchema };

  const endpointTemplate = `/${route.namespace}/${route.path}`
    .replace(/\(\?P<([^>]+)>[^)]+\)/g, "{$1}");

  const description = route.description ??
    `[Auto-discovered] ${route.method} ${endpointTemplate}`;

  server.registerTool(
    toolName,
    { description, inputSchema },
    async (args) => {
      try {
        let endpoint = endpointTemplate;
        const params: Record<string, unknown> = {};
        const body: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
          if (pathParams.includes(key)) {
            endpoint = endpoint.replace(`{${key}}`, encodeURIComponent(String(value)));
          } else if (route.method === "GET" || route.method === "DELETE") {
            params[key] = value;
          } else {
            body[key] = value;
          }
        }

        const options: { method: string; params?: Record<string, unknown>; body?: Record<string, unknown> } = {
          method: route.method,
        };

        if (Object.keys(params).length > 0) options.params = params;
        if (Object.keys(body).length > 0) options.body = body;

        const result = await client.request(endpoint, options);
        return jsonResult(result);
      } catch (err) {
        return handleWpError(err);
      }
    },
  );

  registry.register(toolName);
  return true;
}
