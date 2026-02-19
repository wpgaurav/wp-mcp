#!/usr/bin/env node

import { loadConfig } from "../src/config.js";
import { createWpMcpServer } from "../src/server.js";
import { createStdioTransport } from "../src/transports/stdio.js";
import { startHttpTransport } from "../src/transports/http.js";
import { runSetup } from "../src/setup.js";

async function main() {
  const args = process.argv.slice(2);

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

  const { server } = await createWpMcpServer(config);

  if (config.transport === "http") {
    await startHttpTransport(server, config.host, config.port);
  } else {
    const transport = createStdioTransport();
    await server.connect(transport);
    console.error("wp-mcp server running on stdio");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
