import type { ApiErrorResponse } from "@opspulse/shared";

import { ApiError } from "./api-client.errors";

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
