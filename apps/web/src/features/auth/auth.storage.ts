import type { StoredAuthTokens } from "./auth.types";

const AUTH_STORAGE_KEY = "opspulse.web.auth.v1";

export function readStoredAuthTokens(): StoredAuthTokens | null {
  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredAuthTokens>;

    if (
      typeof parsed.accessToken === "string" &&
      parsed.accessToken.length > 0 &&
      typeof parsed.refreshToken === "string" &&
      parsed.refreshToken.length > 0
    ) {
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken
      };
    }
  } catch {
    // Invalid storage should behave like an expired session.
  }

  clearStoredAuthTokens();
  return null;
}

export function saveStoredAuthTokens(tokens: StoredAuthTokens): void {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
}

export function clearStoredAuthTokens(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
