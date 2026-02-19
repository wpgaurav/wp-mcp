import { describe, it, expect } from "vitest";
import { routeToToolName, extractPathParams, shouldSkipNamespace } from "../../src/discovery/naming.js";

describe("naming", () => {
  describe("shouldSkipNamespace", () => {
    it("skips wp/v2", () => {
      expect(shouldSkipNamespace("wp/v2")).toBe(true);
    });

    it("skips oembed/1.0", () => {
      expect(shouldSkipNamespace("oembed/1.0")).toBe(true);
    });

    it("allows wc/v3", () => {
      expect(shouldSkipNamespace("wc/v3")).toBe(false);
    });

    it("allows acf/v1", () => {
      expect(shouldSkipNamespace("acf/v1")).toBe(false);
    });
  });

  describe("routeToToolName", () => {
    it("generates list name for GET without path params", () => {
      expect(routeToToolName("wc/v3", "products", "GET")).toBe("wc_products_list");
    });

    it("generates get name for GET with path params", () => {
      expect(routeToToolName("wc/v3", "products/(?P<id>[\\d]+)", "GET")).toBe("wc_products_get");
    });

    it("generates create name for POST without path params", () => {
      expect(routeToToolName("wc/v3", "products", "POST")).toBe("wc_products_create");
    });

    it("generates update name for PUT with path params", () => {
      expect(routeToToolName("wc/v3", "products/(?P<id>[\\d]+)", "PUT")).toBe("wc_products_update");
    });

    it("generates delete name for DELETE with path params", () => {
      expect(routeToToolName("wc/v3", "products/(?P<id>[\\d]+)", "DELETE")).toBe("wc_products_delete");
    });

    it("handles nested resources", () => {
      expect(routeToToolName("wc/v3", "orders/(?P<order_id>[\\d]+)/notes", "GET")).toBe("wc_orders_notes_list");
    });

    it("handles nested resources with path param at end", () => {
      expect(routeToToolName("wc/v3", "orders/(?P<order_id>[\\d]+)/notes/(?P<id>[\\d]+)", "GET")).toBe("wc_orders_notes_get");
    });

    it("handles ACF namespace", () => {
      expect(routeToToolName("acf/v1", "posts/(?P<id>[\\d]+)", "GET")).toBe("acf_posts_get");
    });

    it("handles Yoast namespace", () => {
      expect(routeToToolName("yoast/v1", "indexables", "GET")).toBe("yoast_indexables_list");
    });

    it("handles hyphenated resource names", () => {
      expect(routeToToolName("custom-plugin/v1", "my-settings", "GET")).toBe("custom_plugin_my_settings_list");
    });

    it("handles POST with path param as update", () => {
      expect(routeToToolName("acf/v1", "posts/(?P<id>[\\d]+)", "POST")).toBe("acf_posts_update");
    });

    it("handles PATCH as update", () => {
      expect(routeToToolName("wc/v3", "products/(?P<id>[\\d]+)", "PATCH")).toBe("wc_products_update");
    });
  });

  describe("extractPathParams", () => {
    it("extracts single path param", () => {
      expect(extractPathParams("products/(?P<id>[\\d]+)")).toEqual(["id"]);
    });

    it("extracts multiple path params", () => {
      expect(extractPathParams("orders/(?P<order_id>[\\d]+)/notes/(?P<id>[\\d]+)")).toEqual(["order_id", "id"]);
    });

    it("returns empty for no path params", () => {
      expect(extractPathParams("products")).toEqual([]);
    });
  });
});
