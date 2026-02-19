import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WpClient } from "../../src/client/wp-client.js";
import { ToolRegistry } from "../../src/tools/registry.js";
import { runDiscovery } from "../../src/discovery/engine.js";
import discoveryFixture from "../fixtures/wp-json-index.json";

const TEST_CONFIG = {
  wpUrl: "https://example.com",
  wpUsername: "admin",
  wpAppPassword: "xxxx",
};

describe("discovery engine", () => {
  let server: McpServer;
  let client: WpClient;
  let registry: ToolRegistry;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "0.0.1" }, { capabilities: { tools: {} } });
    client = new WpClient(TEST_CONFIG);
    registry = new ToolRegistry();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockDiscovery() {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(discoveryFixture),
      headers: { get: () => null },
    });
  }

  it("discovers WooCommerce product tools", async () => {
    mockDiscovery();
    const count = await runDiscovery(server, client, registry);

    expect(count).toBeGreaterThan(0);
    expect(registry.has("wc_products_list")).toBe(true);
    expect(registry.has("wc_products_get")).toBe(true);
    expect(registry.has("wc_products_create")).toBe(true);
    expect(registry.has("wc_products_update")).toBe(true);
    expect(registry.has("wc_products_delete")).toBe(true);
  });

  it("discovers WooCommerce order tools", async () => {
    mockDiscovery();
    await runDiscovery(server, client, registry);

    expect(registry.has("wc_orders_list")).toBe(true);
    expect(registry.has("wc_orders_get")).toBe(true);
    expect(registry.has("wc_orders_create")).toBe(true);
    expect(registry.has("wc_orders_update")).toBe(true);
    expect(registry.has("wc_orders_delete")).toBe(true);
  });

  it("discovers nested order notes tools", async () => {
    mockDiscovery();
    await runDiscovery(server, client, registry);

    expect(registry.has("wc_orders_notes_list")).toBe(true);
    expect(registry.has("wc_orders_notes_create")).toBe(true);
  });

  it("discovers ACF tools", async () => {
    mockDiscovery();
    await runDiscovery(server, client, registry);

    expect(registry.has("acf_posts_get")).toBe(true);
    expect(registry.has("acf_posts_update")).toBe(true);
  });

  it("discovers Yoast tools", async () => {
    mockDiscovery();
    await runDiscovery(server, client, registry);

    expect(registry.has("yoast_indexables_list")).toBe(true);
  });

  it("discovers custom plugin tools with union types", async () => {
    mockDiscovery();
    await runDiscovery(server, client, registry);

    expect(registry.has("custom_plugin_settings_list")).toBe(true);
    expect(registry.has("custom_plugin_settings_create")).toBe(true);
  });

  it("skips wp/v2 namespace", async () => {
    mockDiscovery();
    await runDiscovery(server, client, registry);

    const wpTools = registry.all().filter((t) => t.startsWith("wp_"));
    expect(wpTools).toEqual(["wp_discover_routes"]);
  });

  it("does not duplicate existing registered tools", async () => {
    mockDiscovery();

    registry.register("wc_products_list");
    const count = await runDiscovery(server, client, registry);

    const productListCount = registry.all().filter((t) => t === "wc_products_list").length;
    expect(productListCount).toBe(1);
  });

  it("registers wp_discover_routes meta tool", async () => {
    mockDiscovery();
    await runDiscovery(server, client, registry);

    expect(registry.has("wp_discover_routes")).toBe(true);
  });
});
