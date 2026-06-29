import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { ApiError } from "../../shared/api/api-client";
import {
  getCurrentUser,
  loginWithPassword,
  logoutAuthSession,
  refreshAuthSession
} from "./auth.api";
import {
  clearStoredAuthTokens,
  readStoredAuthTokens,
  saveStoredAuthTokens
} from "./auth.storage";
import type {
  AuthContextValue,
  AuthSession,
  AuthStatus,
  LoginRequest,
  StoredAuthTokens
} from "./auth.types";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [session, setSession] = useState<AuthSession | null>(null);

  const setAuthenticatedSession = useCallback((nextSession: AuthSession) => {
    saveStoredAuthTokens({
      accessToken: nextSession.accessToken,
      refreshToken: nextSession.refreshToken
    });
    setSession(nextSession);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    clearStoredAuthTokens();
    setSession(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    let isActive = true;

    async function restoreSession() {
      const storedTokens = readStoredAuthTokens();

      if (!storedTokens) {
        if (isActive) {
          setStatus("anonymous");
        }
        return;
      }

      const restoredSession = await restoreFromTokens(storedTokens);

      if (!isActive) {
        return;
      }

      if (restoredSession) {
        setAuthenticatedSession(restoredSession);
      } else {
        clearSession();
      }
    }

    restoreSession();

    return () => {
      isActive = false;
    };
  }, [clearSession, setAuthenticatedSession]);

  const login = useCallback(
    async (input: LoginRequest): Promise<AuthSession> => {
      const response = await loginWithPassword(input);
      const nextSession = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user
      };

      setAuthenticatedSession(nextSession);
      return nextSession;
    },
    [setAuthenticatedSession]
  );

  const logout = useCallback(async () => {
    const tokens = session
      ? {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken
        }
      : readStoredAuthTokens();

    if (tokens) {
      try {
        await logoutAuthSession(tokens);
      } catch {
        // Logout must still clear the browser session if the API is unavailable.
      }
    }

    clearSession();
  }, [clearSession, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      login,
      logout
    }),
    [login, logout, session, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

async function restoreFromTokens(
  tokens: StoredAuthTokens
): Promise<AuthSession | null> {
  try {
    const user = await getCurrentUser(tokens.accessToken);

    return {
      ...tokens,
      user
    };
  } catch (error) {
    if (!(error instanceof ApiError) || error.statusCode !== 401) {
      return null;
    }
  }

  try {
    const refreshed = await refreshAuthSession(tokens.refreshToken);
    const user = await getCurrentUser(refreshed.accessToken);

    return {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      user
    };
  } catch {
    return null;
  }
}
