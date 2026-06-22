import type { ApiErrorResponse } from "@opspulse/shared";

import { mobileEnvironment } from "../config/environment";

const REQUEST_TIMEOUT_MS = 5_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(joinUrl(mobileEnvironment.apiUrl, path), {
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw await toApiError(response);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("The API request timed out.");
    }

    throw new ApiError(
      "Could not reach the OpsPulse API. Check the server and the device-specific API URL."
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message;

    return new ApiError(message, response.status);
  } catch {
    return new ApiError(`API request failed with status ${response.status}.`, response.status);
  }
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}
