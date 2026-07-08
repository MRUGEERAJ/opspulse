import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { ApiError, apiRequest } from "../../shared/api/api-client";
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
  AuthenticatedRequestOptions,
  AuthSession,
  AuthStatus,
  LoginRequest,
  StoredAuthTokens
} from "./auth.types";

const SESSION_EXPIRED_MESSAGE = "Your session expired. Please sign in again.";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);
  const refreshPromiseRef = useRef<Promise<AuthSession> | null>(null);

  const setAuthenticatedSession = useCallback((nextSession: AuthSession) => {
    saveStoredAuthTokens({
      accessToken: nextSession.accessToken,
      refreshToken: nextSession.refreshToken
    });
    sessionRef.current = nextSession;
    setSession(nextSession);
    setSessionMessage(null);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback((message?: string) => {
    clearStoredAuthTokens();
    sessionRef.current = null;
    setSession(null);
    setSessionMessage(message ?? null);
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

      let restoredSession: AuthSession | null;

      try {
        restoredSession = await restoreFromTokens(storedTokens);
      } catch (error) {
        if (isActive) {
          sessionRef.current = null;
          setSession(null);
          setSessionMessage(getSessionRestoreErrorMessage(error));
          setStatus("anonymous");
        }
        return;
      }

      if (!isActive) {
        return;
      }

      if (restoredSession) {
        setAuthenticatedSession(restoredSession);
      } else {
        clearSession(SESSION_EXPIRED_MESSAGE);
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

  const refreshSession = useCallback(async (): Promise<AuthSession> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const tokens = sessionRef.current
      ? {
          accessToken: sessionRef.current.accessToken,
          refreshToken: sessionRef.current.refreshToken
        }
      : readStoredAuthTokens();

    if (!tokens) {
      throw new ApiError(SESSION_EXPIRED_MESSAGE, 401);
    }

    const refreshPromise = (async () => {
      const refreshed = await refreshAuthSession(tokens.refreshToken);
      const user = await getCurrentUser(refreshed.accessToken);
      const nextSession = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        user
      };

      setAuthenticatedSession(nextSession);
      return nextSession;
    })();

    refreshPromiseRef.current = refreshPromise;

    try {
      return await refreshPromise;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, [setAuthenticatedSession]);

  const authenticatedRequest = useCallback(
    async <T,>(
      path: string,
      options: AuthenticatedRequestOptions = {}
    ): Promise<T> => {
      const activeSession = sessionRef.current;

      if (!activeSession) {
        throw new ApiError(SESSION_EXPIRED_MESSAGE, 401);
      }

      try {
        return await apiRequest<T>(path, {
          ...options,
          accessToken: activeSession.accessToken
        });
      } catch (error) {
        if (!isUnauthorizedError(error)) {
          throw error;
        }
      }

      let refreshedSession: AuthSession;

      try {
        refreshedSession = await refreshSession();
      } catch {
        clearSession(SESSION_EXPIRED_MESSAGE);
        throw new ApiError(SESSION_EXPIRED_MESSAGE, 401);
      }

      try {
        return await apiRequest<T>(path, {
          ...options,
          accessToken: refreshedSession.accessToken
        });
      } catch (error) {
        if (isUnauthorizedError(error)) {
          clearSession(SESSION_EXPIRED_MESSAGE);
          throw new ApiError(SESSION_EXPIRED_MESSAGE, 401);
        }

        throw error;
      }
    },
    [clearSession, refreshSession]
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
      sessionMessage,
      authenticatedRequest,
      login,
      logout
    }),
    [authenticatedRequest, login, logout, session, sessionMessage, status]
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
    if (!isUnauthorizedError(error)) {
      throw error;
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
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      throw error;
    }

    return null;
  }
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 401;
}

function getSessionRestoreErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Could not restore your session. Check that the API is running.";
}
