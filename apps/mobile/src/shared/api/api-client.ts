import { mobileEnvironment } from "../config/environment";
import { ApiError } from "./api-client.errors";
import { joinUrl, toApiError } from "./api-client.utils";

const REQUEST_TIMEOUT_MS = 5_000;

export { ApiError } from "./api-client.errors";

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
