import { z, type ZodTypeAny } from "zod";

export interface WpArgDefinition {
  type?: string | string[];
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  items?: { type?: string; enum?: unknown[] };
  format?: string;
}

export function wpArgToZod(_name: string, arg: WpArgDefinition): ZodTypeAny {
  let schema = mapType(arg);

  if (arg.description) {
    schema = schema.describe(arg.description);
  }

  if (!arg.required) {
    schema = schema.optional();
  }

  if (arg.default !== undefined && arg.default !== null) {
    try {
      schema = (schema as z.ZodDefault<ZodTypeAny>).default(arg.default as never);
    } catch {
      // some defaults can't be applied to the schema
    }
  }

  return schema;
}

function mapType(arg: WpArgDefinition): ZodTypeAny {
  const rawType = arg.type;

  if (Array.isArray(rawType)) {
    const types = rawType.filter((t) => t !== "null");
    if (types.length === 1) {
      return mapSingleType(types[0]!, arg);
    }
    if (types.length > 1) {
      const schemas = types.map((t) => mapSingleType(t, arg));
      if (schemas.length === 2) {
        return z.union([schemas[0]!, schemas[1]!]);
      }
      return z.union(schemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
    }
    return z.unknown();
  }

  if (typeof rawType === "string" && rawType.includes(",")) {
    const types = rawType.split(",").map((t) => t.trim()).filter((t) => t !== "null");
    const schemas = types.map((t) => mapSingleType(t, arg));
    if (schemas.length === 2) {
      return z.union([schemas[0]!, schemas[1]!]);
    }
    if (schemas.length > 2) {
      return z.union(schemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
    }
    if (schemas.length === 1) return schemas[0]!;
    return z.unknown();
  }

  if (typeof rawType === "string") {
    return mapSingleType(rawType, arg);
  }

  return z.unknown();
}

function mapSingleType(type: string, arg: WpArgDefinition): ZodTypeAny {
  switch (type) {
    case "integer": {
      let s = z.number().int();
      if (arg.minimum !== undefined) s = s.min(arg.minimum);
      if (arg.maximum !== undefined) s = s.max(arg.maximum);
      return s;
    }
    case "number": {
      let s = z.number();
      if (arg.minimum !== undefined) s = s.min(arg.minimum);
      if (arg.maximum !== undefined) s = s.max(arg.maximum);
      return s;
    }
    case "string": {
      if (arg.enum && arg.enum.length > 0) {
        const values = arg.enum.map(String);
        if (values.length === 1) return z.literal(values[0]!);
        return z.enum(values as [string, ...string[]]);
      }
      return z.string();
    }
    case "boolean":
      return z.boolean();
    case "array": {
      if (arg.items?.type) {
        const itemSchema = mapSingleType(arg.items.type, { enum: arg.items.enum });
        return z.array(itemSchema);
      }
      return z.array(z.unknown());
    }
    case "object":
      return z.record(z.unknown());
    default:
      return z.unknown();
  }
}

export function wpArgsToZodShape(
  args: Record<string, WpArgDefinition>,
): Record<string, ZodTypeAny> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const [name, arg] of Object.entries(args)) {
    shape[name] = wpArgToZod(name, arg);
  }
  return shape;
}
