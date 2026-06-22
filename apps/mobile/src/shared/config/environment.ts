import Config from "react-native-config";

const DEFAULT_API_URL = "http://127.0.0.1:3000";

export const mobileEnvironment = {
  apiUrl: normalizeApiUrl(Config.API_URL ?? DEFAULT_API_URL)
} as const;

function normalizeApiUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw new Error("API_URL must be a valid HTTP(S) URL");
  }

  return trimmed;
}
