import { basicAuthHeader } from "./auth.js";
import { parseWpError, WpApiError } from "./errors.js";
import type { WpMcpConfig } from "../config.js";

export interface WpRequestOptions {
  method?: string;
  params?: Record<string, unknown>;
  body?: Record<string, unknown> | FormData;
  rawBody?: Buffer;
  headers?: Record<string, string>;
}

export interface WpPaginatedResponse<T> {
  data: T;
  total: number;
  totalPages: number;
}

const REQUEST_TIMEOUT_MS = 30_000;

export class WpClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: Pick<WpMcpConfig, "wpUrl" | "wpUsername" | "wpAppPassword">) {
    this.baseUrl = `${config.wpUrl.replace(/\/+$/, "")}/wp-json`;
    this.authHeader = basicAuthHeader(config.wpUsername, config.wpAppPassword);
  }

  async request<T = unknown>(endpoint: string, options: WpRequestOptions = {}): Promise<T> {
    const { method = "GET", params, body, rawBody, headers = {} } = options;

    let url = `${this.baseUrl}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

    const fetchHeaders: Record<string, string> = {
      Authorization: this.authHeader,
      ...headers,
    };

    let fetchBody: Buffer | FormData | string | undefined;
    if (rawBody) {
      fetchBody = rawBody;
    } else if (isFormData) {
      fetchBody = body as FormData;
    } else if (body) {
      fetchHeaders["Content-Type"] ??= "application/json";
      fetchBody = JSON.stringify(body);
    }

    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: fetchBody,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw await parseWpError(response);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  async requestPaginated<T = unknown>(
    endpoint: string,
    options: WpRequestOptions = {},
  ): Promise<WpPaginatedResponse<T>> {
    const { method = "GET", params, body, headers = {} } = options;

    let url = `${this.baseUrl}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const fetchHeaders: Record<string, string> = {
      Authorization: this.authHeader,
      ...headers,
    };

    if (body) {
      fetchHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw await parseWpError(response);
    }

    const data = (await response.json()) as T;
    const total = parseInt(response.headers.get("X-WP-Total") ?? "0", 10);
    const totalPages = parseInt(response.headers.get("X-WP-TotalPages") ?? "0", 10);

    return { data, total, totalPages };
  }

  async fetchRawJson<T = unknown>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      headers: { Authorization: this.authHeader },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw await parseWpError(response);
    }

    return (await response.json()) as T;
  }

  get wpApiError(): typeof WpApiError {
    return WpApiError;
  }
}
