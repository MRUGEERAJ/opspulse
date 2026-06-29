import { webEnvironment } from "../config/env";
import { ApiError } from "./api-client.errors";
import { joinUrl, toApiError, unwrapApiData } from "./api-client.utils";

const REQUEST_TIMEOUT_MS = 5_000;

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string;
  unwrapData?: boolean;
};

export { ApiError } from "./api-client.errors";

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, {
    unwrapData: false
  });
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );
  const headers = buildHeaders(options);

  try {
    const response = await fetch(joinUrl(webEnvironment.apiUrl, path), {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });

    if (!response.ok) {
      throw await toApiError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const value = (await response.json()) as unknown;

    if (options.unwrapData === false) {
      return value as T;
    }

    return unwrapApiData<T>(value);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The API request timed out.");
    }

    throw new ApiError(
      "Could not reach the OpsPulse API. Check that it is running and CORS is configured."
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function buildHeaders(options: ApiRequestOptions): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json"
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  return headers;
}
