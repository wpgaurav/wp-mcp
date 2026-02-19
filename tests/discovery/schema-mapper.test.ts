import { describe, it, expect } from "vitest";
import { z } from "zod";
import { wpArgToZod, wpArgsToZodShape } from "../../src/discovery/schema-mapper.js";

describe("schema-mapper", () => {
  describe("wpArgToZod", () => {
    it("maps integer type", () => {
      const schema = wpArgToZod("page", { type: "integer", required: true });
      expect(schema.safeParse(1).success).toBe(true);
      expect(schema.safeParse(1.5).success).toBe(false);
      expect(schema.safeParse("foo").success).toBe(false);
    });

    it("maps integer with min/max", () => {
      const schema = wpArgToZod("page", { type: "integer", minimum: 1, maximum: 100, required: true });
      expect(schema.safeParse(1).success).toBe(true);
      expect(schema.safeParse(100).success).toBe(true);
      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(101).success).toBe(false);
    });

    it("maps number type", () => {
      const schema = wpArgToZod("price", { type: "number", required: true });
      expect(schema.safeParse(9.99).success).toBe(true);
      expect(schema.safeParse(10).success).toBe(true);
    });

    it("maps string type", () => {
      const schema = wpArgToZod("search", { type: "string", required: true });
      expect(schema.safeParse("hello").success).toBe(true);
      expect(schema.safeParse(123).success).toBe(false);
    });

    it("maps string with enum", () => {
      const schema = wpArgToZod("status", {
        type: "string",
        enum: ["publish", "draft", "pending"],
        required: true,
      });
      expect(schema.safeParse("publish").success).toBe(true);
      expect(schema.safeParse("draft").success).toBe(true);
      expect(schema.safeParse("unknown").success).toBe(false);
    });

    it("maps boolean type", () => {
      const schema = wpArgToZod("force", { type: "boolean", required: true });
      expect(schema.safeParse(true).success).toBe(true);
      expect(schema.safeParse(false).success).toBe(true);
      expect(schema.safeParse("true").success).toBe(false);
    });

    it("maps array type with typed items", () => {
      const schema = wpArgToZod("ids", {
        type: "array",
        items: { type: "integer" },
        required: true,
      });
      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
      expect(schema.safeParse(["a"]).success).toBe(false);
    });

    it("maps array type without item type", () => {
      const schema = wpArgToZod("items", { type: "array", required: true });
      expect(schema.safeParse([1, "a", true]).success).toBe(true);
    });

    it("maps object type", () => {
      const schema = wpArgToZod("meta", { type: "object", required: true });
      expect(schema.safeParse({ key: "value" }).success).toBe(true);
    });

    it("maps union types (comma-separated)", () => {
      const schema = wpArgToZod("value", { type: "string,integer", required: true });
      expect(schema.safeParse("hello").success).toBe(true);
      expect(schema.safeParse(42).success).toBe(true);
    });

    it("maps array union types", () => {
      const schema = wpArgToZod("value", { type: ["string", "integer"], required: true });
      expect(schema.safeParse("hello").success).toBe(true);
      expect(schema.safeParse(42).success).toBe(true);
    });

    it("makes non-required fields optional", () => {
      const schema = wpArgToZod("search", { type: "string", required: false });
      expect(schema.safeParse(undefined).success).toBe(true);
      expect(schema.safeParse("test").success).toBe(true);
    });

    it("preserves description", () => {
      const schema = wpArgToZod("page", {
        type: "integer",
        description: "Current page of the collection.",
        required: true,
      });
      expect(schema.description).toBe("Current page of the collection.");
    });

    it("falls back to unknown for unrecognized types", () => {
      const schema = wpArgToZod("weird", { type: "weird_type", required: true });
      expect(schema.safeParse("anything").success).toBe(true);
      expect(schema.safeParse(42).success).toBe(true);
    });

    it("handles missing type", () => {
      const schema = wpArgToZod("noType", { required: true });
      expect(schema.safeParse("anything").success).toBe(true);
    });
  });

  describe("wpArgsToZodShape", () => {
    it("converts a full args object to Zod shape", () => {
      const shape = wpArgsToZodShape({
        page: { type: "integer", default: 1, minimum: 1, required: false },
        per_page: { type: "integer", default: 10, minimum: 1, maximum: 100, required: false },
        search: { type: "string", required: false },
        status: { type: "string", enum: ["publish", "draft"], required: false },
      });

      expect(Object.keys(shape)).toEqual(["page", "per_page", "search", "status"]);
      expect(shape["page"]!.safeParse(1).success).toBe(true);
      expect(shape["status"]!.safeParse("publish").success).toBe(true);
      expect(shape["status"]!.safeParse("unknown").success).toBe(false);
    });
  });
});
