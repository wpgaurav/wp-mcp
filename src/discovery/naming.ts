const SKIP_NAMESPACES = new Set(["wp/v2", "oembed/1.0"]);

export function shouldSkipNamespace(namespace: string): boolean {
  return SKIP_NAMESPACES.has(namespace);
}

export function routeToToolName(
  namespace: string,
  routePath: string,
  method: string,
): string {
  const prefix = namespace
    .replace(/\/v\d+(\.\d+)?$/, "")
    .replace(/[/-]/g, "_")
    .toLowerCase();

  const cleaned = routePath
    .replace(/\(\?P<[^>]+>[^)]+\)/g, "{param}")
    .replace(/[()[\]\\^$.+*?|]/g, "");

  const segments = cleaned
    .split("/")
    .filter(Boolean)
    .filter((s) => !s.startsWith("{"));

  const endsWithPathParam = /\(\?P<[^>]+>[^)]+\)\/?$/.test(routePath);
  const action = inferAction(method, endsWithPathParam);

  const resourceParts = segments.map((s) => s.replace(/-/g, "_").toLowerCase());
  const name = [prefix, ...resourceParts, action].join("_");

  return name.replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function inferAction(method: string, hasPathParam: boolean): string {
  switch (method.toUpperCase()) {
    case "GET":
      return hasPathParam ? "get" : "list";
    case "POST":
      return hasPathParam ? "update" : "create";
    case "PUT":
    case "PATCH":
      return "update";
    case "DELETE":
      return "delete";
    default:
      return method.toLowerCase();
  }
}

export function extractPathParams(routePattern: string): string[] {
  const matches = routePattern.matchAll(/\(\?P<([^>]+)>/g);
  return [...matches].map((m) => m[1]!);
}
