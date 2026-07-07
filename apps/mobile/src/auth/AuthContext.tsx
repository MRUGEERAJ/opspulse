import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { ApiError } from "../shared/api/api-client";
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
  AuthSessionResponse,
  AuthStatus,
  AuthUser,
  LoginRequest,
  StoredAuthTokens
} from "./auth.types";

const FIELD_AGENT_ONLY_MESSAGE = "Mobile app is only for Field Agents.";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [session, setSession] = useState<AuthSession | null>(null);

  const setAuthenticatedSession = useCallback(
    async (nextSession: AuthSession) => {
      await saveStoredAuthTokens({
        accessToken: nextSession.accessToken,
        refreshToken: nextSession.refreshToken
      });
      setSession(nextSession);
      setStatus("authenticated");
    },
    []
  );

  const clearSession = useCallback(async () => {
    await clearStoredAuthTokens();
    setSession(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    let isActive = true;

    async function restoreSession() {
      const storedTokens = await readStoredAuthTokens();

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
        await setAuthenticatedSession(restoredSession);
      } else {
        await clearSession();
      }
    }

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, [clearSession, setAuthenticatedSession]);

  const login = useCallback(
    async (input: LoginRequest): Promise<AuthSession> => {
      const response = await loginWithPassword(input);
      const nextSession = toFieldAgentSession(response);

      if (!nextSession) {
        await rejectNonFieldAgentLogin(response);
        throw new ApiError(FIELD_AGENT_ONLY_MESSAGE, 403);
      }

      await setAuthenticatedSession(nextSession);
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
      : await readStoredAuthTokens();

    if (tokens) {
      try {
        await logoutAuthSession(tokens);
      } catch {
        // Local logout must still succeed if the API is unavailable.
      }
    }

    await clearSession();
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
    return toFieldAgentSession({
      ...tokens,
      user
    });
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      return null;
    }
  }

  try {
    const refreshed = await refreshAuthSession(tokens.refreshToken);
    const user = await getCurrentUser(refreshed.accessToken);

    return toFieldAgentSession({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      user
    });
  } catch {
    return null;
  }
}

async function rejectNonFieldAgentLogin(
  response: AuthSessionResponse
): Promise<void> {
  try {
    await logoutAuthSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken
    });
  } catch {
    // The important local behavior is that we do not keep this mobile session.
  }

  await clearStoredAuthTokens();
}

function toFieldAgentSession(
  input: StoredAuthTokens & { user: AuthUser }
): AuthSession | null {
  if (input.user.role !== "FIELD_AGENT") {
    return null;
  }

  return {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    user: {
      ...input.user,
      role: input.user.role
    }
  };
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 401;
}
