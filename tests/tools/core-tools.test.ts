import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WpClient } from "../../src/client/wp-client.js";
import { ToolRegistry } from "../../src/tools/registry.js";
import { registerPostsTools } from "../../src/tools/content/posts.js";
import { registerPluginsTools } from "../../src/tools/management/plugins.js";
import { registerSearchTools } from "../../src/tools/advanced/search.js";
import postsFixture from "../fixtures/posts-list.json";
import postFixture from "../fixtures/post-single.json";

const TEST_CONFIG = {
  wpUrl: "https://example.com",
  wpUsername: "admin",
  wpAppPassword: "xxxx",
};

interface RegisteredToolsMap {
  [name: string]: { handler: (args: Record<string, unknown>, extra: unknown) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> };
}

function getToolHandler(server: McpServer, name: string) {
  const tools = (server as unknown as { _registeredTools: RegisteredToolsMap })._registeredTools;
  const tool = tools[name];
  if (!tool) throw new Error(`Tool ${name} not registered`);
  return tool.handler;
}

function mockFetch(response: {
  ok?: boolean;
  status?: number;
  json?: unknown;
  headers?: Record<string, string>;
}) {
  const headers = new Map(Object.entries(response.headers ?? {}));
  const jsonBody = response.json ?? {};
  return vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    statusText: "OK",
    json: () => Promise.resolve(jsonBody),
    text: () => Promise.resolve(JSON.stringify(jsonBody)),
    headers: { get: (key: string) => headers.get(key) ?? null },
  });
}

describe("core tools", () => {
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

  describe("posts tools", () => {
    beforeEach(() => {
      registerPostsTools(server, client, registry);
    });

    it("registers all post tools", () => {
      expect(registry.has("wp_posts_list")).toBe(true);
      expect(registry.has("wp_posts_get")).toBe(true);
      expect(registry.has("wp_posts_create")).toBe(true);
      expect(registry.has("wp_posts_update")).toBe(true);
      expect(registry.has("wp_posts_delete")).toBe(true);
    });

    it("wp_posts_list calls correct endpoint", async () => {
      const fetchMock = mockFetch({
        json: postsFixture,
        headers: { "X-WP-Total": "2", "X-WP-TotalPages": "1" },
      });
      globalThis.fetch = fetchMock;

      const handler = getToolHandler(server, "wp_posts_list");
      const result = await handler({ per_page: 10, page: 1 }, {});

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toContain("/wp/v2/posts");
      expect(url).toContain("per_page=10");

      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.total).toBe(2);
    });

    it("wp_posts_get calls correct endpoint with ID", async () => {
      const fetchMock = mockFetch({ json: postFixture });
      globalThis.fetch = fetchMock;

      const handler = getToolHandler(server, "wp_posts_get");
      const result = await handler({ id: 1 }, {});

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toContain("/wp/v2/posts/1");

      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.id).toBe(1);
      expect(parsed.title.rendered).toBe("Hello World");
    });

    it("wp_posts_create sends POST with body", async () => {
      const fetchMock = mockFetch({ json: { id: 3, title: { rendered: "New Post" }, status: "draft" } });
      globalThis.fetch = fetchMock;

      const handler = getToolHandler(server, "wp_posts_create");
      await handler({ title: "New Post", status: "draft" }, {});

      const [url, opts] = fetchMock.mock.calls[0]!;
      expect(url).toContain("/wp/v2/posts");
      expect(opts.method).toBe("POST");
      expect(JSON.parse(opts.body)).toMatchObject({ title: "New Post" });
    });

    it("wp_posts_delete sends DELETE", async () => {
      const fetchMock = mockFetch({ json: { id: 1, deleted: true } });
      globalThis.fetch = fetchMock;

      const handler = getToolHandler(server, "wp_posts_delete");
      await handler({ id: 1, force: false }, {});

      const [url, opts] = fetchMock.mock.calls[0]!;
      expect(url).toContain("/wp/v2/posts/1");
      expect(opts.method).toBe("DELETE");
    });

    it("returns MCP error on WP API error", async () => {
      const fetchMock = mockFetch({
        ok: false,
        status: 404,
        json: { code: "rest_post_invalid_id", message: "Invalid post ID.", data: { status: 404 } },
      });
      globalThis.fetch = fetchMock;

      const handler = getToolHandler(server, "wp_posts_get");
      const result = await handler({ id: 99999 }, {});

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain("404");
      expect(result.content[0]!.text).toContain("rest_post_invalid_id");
    });
  });

  describe("plugins tools", () => {
    beforeEach(() => {
      registerPluginsTools(server, client, registry);
    });

    it("registers all plugin tools", () => {
      expect(registry.has("wp_plugins_list")).toBe(true);
      expect(registry.has("wp_plugins_get")).toBe(true);
      expect(registry.has("wp_plugins_activate")).toBe(true);
      expect(registry.has("wp_plugins_deactivate")).toBe(true);
    });

    it("wp_plugins_activate sends PUT with active status", async () => {
      const fetchMock = mockFetch({ json: { plugin: "akismet/akismet", status: "active" } });
      globalThis.fetch = fetchMock;

      const handler = getToolHandler(server, "wp_plugins_activate");
      await handler({ plugin: "akismet/akismet" }, {});

      const [url, opts] = fetchMock.mock.calls[0]!;
      expect(url).toContain("/wp/v2/plugins/akismet%2Fakismet");
      expect(opts.method).toBe("PUT");
      expect(JSON.parse(opts.body).status).toBe("active");
    });

    it("wp_plugins_deactivate sends PUT with inactive status", async () => {
      const fetchMock = mockFetch({ json: { plugin: "akismet/akismet", status: "inactive" } });
      globalThis.fetch = fetchMock;

      const handler = getToolHandler(server, "wp_plugins_deactivate");
      await handler({ plugin: "akismet/akismet" }, {});

      const [, opts] = fetchMock.mock.calls[0]!;
      expect(JSON.parse(opts.body).status).toBe("inactive");
    });
  });

  describe("search tool", () => {
    beforeEach(() => {
      registerSearchTools(server, client, registry);
    });

    it("wp_search calls search endpoint", async () => {
      const fetchMock = mockFetch({
        json: [{ id: 1, title: "Hello", type: "post", url: "https://example.com/hello" }],
        headers: { "X-WP-Total": "1", "X-WP-TotalPages": "1" },
      });
      globalThis.fetch = fetchMock;

      const handler = getToolHandler(server, "wp_search");
      const result = await handler({ search: "hello", per_page: 10, page: 1 }, {});

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toContain("/wp/v2/search");
      expect(url).toContain("search=hello");

      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.total).toBe(1);
    });
  });

  describe("tool registry", () => {
    it("tracks registered tool names", () => {
      const reg = new ToolRegistry();
      expect(reg.has("wp_posts_list")).toBe(false);
      reg.register("wp_posts_list");
      expect(reg.has("wp_posts_list")).toBe(true);
    });

    it("returns all registered names", () => {
      const reg = new ToolRegistry();
      reg.register("a");
      reg.register("b");
      reg.register("c");
      expect(reg.all()).toEqual(["a", "b", "c"]);
    });
  });
});
