export class WpApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly wpCode: string,
    message: string,
  ) {
    super(message);
    this.name = "WpApiError";
  }

  toMcpError(): { content: Array<{ type: "text"; text: string }>; isError: true } {
    return {
      content: [{ type: "text", text: `WordPress API error (${this.statusCode}): [${this.wpCode}] ${this.message}` }],
      isError: true,
    };
  }
}

interface WpErrorBody {
  code?: string;
  message?: string;
  data?: { status?: number };
}

export async function parseWpError(response: Response): Promise<WpApiError> {
  let body: WpErrorBody = {};
  try {
    body = (await response.json()) as WpErrorBody;
  } catch {
    // non-JSON error response
  }

  return new WpApiError(
    response.status,
    body.code ?? "unknown_error",
    body.message ?? response.statusText,
  );
}
