import * as Keychain from "react-native-keychain";

import type { StoredAuthTokens } from "./auth.types";

const AUTH_STORAGE_SERVICE = "opspulse.mobile.auth.v1";
const AUTH_STORAGE_USERNAME = "opspulse-mobile-session";

export async function readStoredAuthTokens(): Promise<StoredAuthTokens | null> {
  const credentials = await Keychain.getGenericPassword({
    service: AUTH_STORAGE_SERVICE
  });

  if (!credentials) {
    return null;
  }

  try {
    const parsed = JSON.parse(credentials.password) as Partial<StoredAuthTokens>;

    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string"
    ) {
      await clearStoredAuthTokens();
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken
    };
  } catch {
    await clearStoredAuthTokens();
    return null;
  }
}

export async function saveStoredAuthTokens(
  tokens: StoredAuthTokens
): Promise<void> {
  await Keychain.setGenericPassword(
    AUTH_STORAGE_USERNAME,
    JSON.stringify(tokens),
    {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      service: AUTH_STORAGE_SERVICE
    }
  );
}

export async function clearStoredAuthTokens(): Promise<void> {
  await Keychain.resetGenericPassword({
    service: AUTH_STORAGE_SERVICE
  });
}
