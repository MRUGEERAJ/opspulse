const DEFAULT_API_URL = "http://localhost:3000";
const DEFAULT_API_BASE_PATH = "api/v1";

export const webEnvironment = {
  apiUrl: normalizeApiUrl(import.meta.env.VITE_API_URL ?? DEFAULT_API_URL),
  apiBasePath: normalizeApiBasePath(
    import.meta.env.VITE_API_BASE_PATH ?? DEFAULT_API_BASE_PATH
  )
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

function normalizeApiBasePath(value: string): string {
  const normalized = value.trim().replace(/^\/+|\/+$/g, "");

  if (normalized.length === 0) {
    throw new Error("VITE_API_BASE_PATH must not be empty");
  }

  return normalized;
}
