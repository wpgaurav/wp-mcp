import { WpApiError } from "../client/errors.js";

export function handleWpError(err: unknown): { content: Array<{ type: "text"; text: string }>; isError: true } {
  if (err instanceof WpApiError) {
    return err.toMcpError();
  }
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

export function jsonResult(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export function paginatedResult(data: unknown, total: number, totalPages: number): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: JSON.stringify({ data, total, totalPages }, null, 2) }] };
}
