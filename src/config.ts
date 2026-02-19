export interface WpMcpConfig {
  wpUrl: string;
  wpUsername: string;
  wpAppPassword: string;
  transport: "stdio" | "http";
  port: number;
  host: string;
  discover: boolean;
  maxTools: number;
}

export function loadConfig(overrides: Partial<WpMcpConfig> = {}): WpMcpConfig {
  const config: WpMcpConfig = {
    wpUrl: overrides.wpUrl ?? process.env["WP_URL"] ?? "",
    wpUsername: overrides.wpUsername ?? process.env["WP_USERNAME"] ?? "",
    wpAppPassword: overrides.wpAppPassword ?? process.env["WP_APP_PASSWORD"] ?? "",
    transport:
      (overrides.transport ?? process.env["WP_MCP_TRANSPORT"] ?? "stdio") as WpMcpConfig["transport"],
    port: overrides.port ?? parseInt(process.env["WP_MCP_PORT"] ?? "3000", 10),
    host: overrides.host ?? process.env["WP_MCP_HOST"] ?? "127.0.0.1",
    discover: overrides.discover ?? (process.env["WP_MCP_DISCOVER"] !== "false"),
    maxTools: overrides.maxTools ?? parseInt(process.env["WP_MCP_MAX_TOOLS"] ?? "128", 10),
  };

  config.wpUrl = config.wpUrl.replace(/\/+$/, "");

  if (!config.wpUrl) throw new Error("WP_URL is required");
  if (!config.wpUsername) throw new Error("WP_USERNAME is required");
  if (!config.wpAppPassword) throw new Error("WP_APP_PASSWORD is required");

  return config;
}
