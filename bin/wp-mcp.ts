#!/usr/bin/env node

import { loadConfig } from "../src/config.js";
import { createWpMcpServer, createWpMcpServerFactory } from "../src/server.js";
import { createStdioTransport } from "../src/transports/stdio.js";
import { startHttpTransport } from "../src/transports/http.js";
import { runSetup } from "../src/setup.js";

function printHelp(): void {
  console.log(`
wp-mcp — WordPress MCP Server

Usage:
  npx @wpgaurav/wp-mcp                Start the server (stdio transport)
  npx @wpgaurav/wp-mcp setup          Interactive setup wizard
  npx @wpgaurav/wp-mcp --help         Show this help

Options:
  --transport <stdio|http>   Transport type (default: stdio)
  --port <number>            HTTP port (default: 3000)
  --host <address>           HTTP bind address (default: 127.0.0.1)
  --no-discover              Disable auto-discovery of plugin endpoints

Environment variables:
  WP_URL              WordPress site URL (required)
  WP_USERNAME         WordPress username (required)
  WP_APP_PASSWORD     Application Password (required)
  WP_MCP_TRANSPORT    stdio or http (default: stdio)
  WP_MCP_PORT         HTTP port (default: 3000)
  WP_MCP_HOST         HTTP bind address (default: 127.0.0.1)
  WP_MCP_DISCOVER     Auto-discover plugin endpoints (default: true)
  WP_MCP_MAX_TOOLS    Max total tools, core + discovered (default: 128)

Quick start:
  npx @wpgaurav/wp-mcp setup
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  if (args[0] === "setup") {
    await runSetup();
    return;
  }

  const overrides: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--transport" && args[i + 1]) {
      overrides["transport"] = args[++i]!;
    } else if (arg === "--port" && args[i + 1]) {
      overrides["port"] = args[++i]!;
    } else if (arg === "--host" && args[i + 1]) {
      overrides["host"] = args[++i]!;
    } else if (arg === "--no-discover") {
      overrides["discover"] = "false";
    }
  }

  const config = loadConfig({
    transport: overrides["transport"] as "stdio" | "http" | undefined,
    port: overrides["port"] ? parseInt(overrides["port"], 10) : undefined,
    host: overrides["host"],
    discover: overrides["discover"] === "false" ? false : undefined,
  });

  if (config.transport === "http") {
    const factory = await createWpMcpServerFactory(config);
    await startHttpTransport(factory, config.host, config.port);
  } else {
    const { server } = await createWpMcpServer(config);
    const transport = createStdioTransport();
    await server.connect(transport);
    console.error("wp-mcp server running on stdio");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
