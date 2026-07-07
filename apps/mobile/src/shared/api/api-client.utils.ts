import type { ApiErrorResponse } from "@opspulse/shared";

import { ApiError } from "./api-client.errors";

type WrappedApiResponse<T> = {
  success: true;
  data: T;
};

export async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message;

    return new ApiError(message, response.status);
  } catch {
    return new ApiError(
      `API request failed with status ${response.status}.`,
      response.status
    );
  }
}

export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}

export function unwrapApiData<T>(value: unknown): T {
  if (isWrappedApiResponse<T>(value)) {
    return value.data;
  }

  return value as T;
}

function isWrappedApiResponse<T>(value: unknown): value is WrappedApiResponse<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "data" in value &&
    value.success === true
  );
}
