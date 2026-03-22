import axios, { AxiosInstance, AxiosError } from "axios";
import {
  JIKAN_BASE_URL,
  REQUEST_TIMEOUT_MS,
  RATE_LIMIT_DELAY_MS,
} from "../constants.js";

// ─── Jikan API Client ──────────────────────────────────────────────────────

const jikanClient: AxiosInstance = axios.create({
  baseURL: JIKAN_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json",
  },
});

// Simple in-memory rate limit tracker (Jikan: 3 req/sec, 60/min)
let lastRequestTime = 0;

async function rateLimitedFetch(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function jikanGet<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  await rateLimitedFetch();

  // Remove undefined params
  const cleanParams: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) cleanParams[k] = v;
    }
  }

  try {
    const response = await jikanClient.get<T>(endpoint, {
      params: Object.keys(cleanParams).length > 0 ? cleanParams : undefined,
    });
    return response.data;
  } catch (err) {
    const axErr = err as AxiosError<{ message?: string; error?: string }>;
    if (axErr.response) {
      const status = axErr.response.status;
      const msg =
        axErr.response.data?.message ||
        axErr.response.data?.error ||
        axErr.message;

      if (status === 404) throw new Error(`Not found: ${endpoint}`);
      if (status === 429)
        throw new Error(
          "Rate limit exceeded (Jikan allows 3 req/sec, 60 req/min). Please wait and retry."
        );
      if (status >= 500)
        throw new Error(`Jikan API server error (${status}): ${msg}`);

      throw new Error(`Jikan API error (${status}): ${msg}`);
    }
    if (axErr.code === "ECONNABORTED")
      throw new Error("Request timed out. The Jikan API may be slow — try again.");
    throw new Error(`Network error: ${axErr.message}`);
  }
}
