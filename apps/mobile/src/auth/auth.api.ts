import { apiRequest } from "../shared/api/api-client";
import type {
  AuthSessionResponse,
  AuthUser,
  LoginRequest,
  StoredAuthTokens
} from "./auth.types";

const API_BASE_PATH = "/api/v1";

export function loginWithPassword(
  input: LoginRequest
): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>(apiPath("/auth/login"), {
    method: "POST",
    body: input
  });
}

export function refreshAuthSession(
  refreshToken: string
): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>(apiPath("/auth/refresh"), {
    method: "POST",
    body: { refreshToken }
  });
}

export function getCurrentUser(accessToken: string): Promise<AuthUser> {
  return apiRequest<AuthUser>(apiPath("/auth/me"), {
    accessToken
  });
}

export function logoutAuthSession(tokens: StoredAuthTokens): Promise<void> {
  return apiRequest<void>(apiPath("/auth/logout"), {
    method: "POST",
    body: {
      refreshToken: tokens.refreshToken
    },
    accessToken: tokens.accessToken
  });
}

function apiPath(path: string): string {
  return `${API_BASE_PATH}/${path.replace(/^\/+/, "")}`;
}
