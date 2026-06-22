const DEFAULT_API_URL = "http://localhost:3000";

export const webEnvironment = {
  apiUrl: normalizeApiUrl(import.meta.env.VITE_API_URL ?? DEFAULT_API_URL)
} as const;

function normalizeApiUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw new Error("VITE_API_URL must be a valid HTTP(S) URL");
  }

  return trimmed;
}
