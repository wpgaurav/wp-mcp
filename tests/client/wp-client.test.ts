import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WpClient } from "../../src/client/wp-client.js";
import { WpApiError } from "../../src/client/errors.js";

const TEST_CONFIG = {
  wpUrl: "https://example.com",
  wpUsername: "admin",
  wpAppPassword: "xxxx xxxx xxxx",
};

function mockFetch(response: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: unknown;
  headers?: Record<string, string>;
}) {
  const headers = new Map(Object.entries(response.headers ?? {}));
  return vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    statusText: response.statusText ?? "OK",
    json: () => Promise.resolve(response.json ?? {}),
    headers: { get: (key: string) => headers.get(key) ?? null },
  });
}

describe("WpClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("request", () => {
    it("sends GET request with auth header", async () => {
      const fetchMock = mockFetch({ json: [{ id: 1, title: "Test" }] });
      globalThis.fetch = fetchMock;

      const client = new WpClient(TEST_CONFIG);
      const result = await client.request("/wp/v2/posts");

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, opts] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://example.com/wp-json/wp/v2/posts");
      expect(opts.method).toBe("GET");
      expect(opts.headers.Authorization).toMatch(/^Basic /);
      expect(result).toEqual([{ id: 1, title: "Test" }]);
    });

    it("encodes Basic Auth header correctly", async () => {
      const fetchMock = mockFetch({ json: {} });
      globalThis.fetch = fetchMock;

      const client = new WpClient(TEST_CONFIG);
      await client.request("/wp/v2/posts");

      const [, opts] = fetchMock.mock.calls[0]!;
      const expected = Buffer.from("admin:xxxx xxxx xxxx").toString("base64");
      expect(opts.headers.Authorization).toBe(`Basic ${expected}`);
    });

    it("appends query params for GET requests", async () => {
      const fetchMock = mockFetch({ json: [] });
      globalThis.fetch = fetchMock;

      const client = new WpClient(TEST_CONFIG);
      await client.request("/wp/v2/posts", {
        params: { per_page: 5, search: "hello", empty: undefined },
      });

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toContain("per_page=5");
      expect(url).toContain("search=hello");
      expect(url).not.toContain("empty");
    });

    it("sends JSON body for POST requests", async () => {
      const fetchMock = mockFetch({ json: { id: 1 } });
      globalThis.fetch = fetchMock;

      const client = new WpClient(TEST_CONFIG);
      await client.request("/wp/v2/posts", {
        method: "POST",
        body: { title: "New Post", status: "draft" },
      });

      const [, opts] = fetchMock.mock.calls[0]!;
      expect(opts.method).toBe("POST");
      expect(opts.headers["Content-Type"]).toBe("application/json");
      expect(JSON.parse(opts.body)).toEqual({ title: "New Post", status: "draft" });
    });

    it("sends raw body for media uploads", async () => {
      const fetchMock = mockFetch({ json: { id: 42 } });
      globalThis.fetch = fetchMock;

      const client = new WpClient(TEST_CONFIG);
      const buffer = Buffer.from("fake-image-data");
      await client.request("/wp/v2/media", {
        method: "POST",
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": 'attachment; filename="test.png"',
        },
        rawBody: buffer,
      });

      const [, opts] = fetchMock.mock.calls[0]!;
      expect(opts.body).toBe(buffer);
      expect(opts.headers["Content-Type"]).toBe("image/png");
      expect(opts.headers["Content-Disposition"]).toContain("test.png");
    });

    it("throws WpApiError on error response", async () => {
      const fetchMock = mockFetch({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: { code: "rest_post_invalid_id", message: "Invalid post ID.", data: { status: 404 } },
      });
      globalThis.fetch = fetchMock;

      const client = new WpClient(TEST_CONFIG);
      await expect(client.request("/wp/v2/posts/99999")).rejects.toThrow(WpApiError);

      try {
        await client.request("/wp/v2/posts/99999");
      } catch (err) {
        const wpErr = err as WpApiError;
        expect(wpErr.statusCode).toBe(404);
        expect(wpErr.wpCode).toBe("rest_post_invalid_id");
        expect(wpErr.message).toBe("Invalid post ID.");
      }
    });

    it("returns empty object for 204 responses", async () => {
      const fetchMock = mockFetch({ status: 204, json: undefined });
      globalThis.fetch = fetchMock;

      const client = new WpClient(TEST_CONFIG);
      const result = await client.request("/wp/v2/posts/1", { method: "DELETE" });
      expect(result).toEqual({});
    });

    it("strips trailing slash from base URL", async () => {
      const fetchMock = mockFetch({ json: {} });
      globalThis.fetch = fetchMock;

      const client = new WpClient({ ...TEST_CONFIG, wpUrl: "https://example.com/" });
      await client.request("/wp/v2/posts");

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).not.toContain("//wp-json");
    });
  });

  describe("requestPaginated", () => {
    it("returns data with pagination info from headers", async () => {
      const fetchMock = mockFetch({
        json: [{ id: 1 }, { id: 2 }],
        headers: { "X-WP-Total": "25", "X-WP-TotalPages": "3" },
      });
      globalThis.fetch = fetchMock;

      const client = new WpClient(TEST_CONFIG);
      const result = await client.requestPaginated("/wp/v2/posts", {
        params: { per_page: 10 },
      });

      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
    });

    it("defaults to 0 when pagination headers are missing", async () => {
      const fetchMock = mockFetch({ json: [] });
      globalThis.fetch = fetchMock;

      const client = new WpClient(TEST_CONFIG);
      const result = await client.requestPaginated("/wp/v2/posts");

      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe("fetchRawJson", () => {
    it("fetches raw JSON from a path", async () => {
      const fetchMock = mockFetch({ json: { namespaces: ["wp/v2"] } });
      globalThis.fetch = fetchMock;

      const client = new WpClient(TEST_CONFIG);
      const result = await client.fetchRawJson<{ namespaces: string[] }>("/");

      expect(result.namespaces).toEqual(["wp/v2"]);
      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://example.com/wp-json/");
    });
  });

  describe("WpApiError", () => {
    it("converts to MCP error format", () => {
      const err = new WpApiError(403, "rest_forbidden", "Sorry, you are not allowed to do that.");
      const mcpErr = err.toMcpError();

      expect(mcpErr.isError).toBe(true);
      expect(mcpErr.content[0]!.text).toContain("403");
      expect(mcpErr.content[0]!.text).toContain("rest_forbidden");
      expect(mcpErr.content[0]!.text).toContain("not allowed");
    });
  });
});
