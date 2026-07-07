import type { UserRole } from "@opspulse/shared";

export type MobileAuthRole = Extract<UserRole, "FIELD_AGENT">;

export type AuthUser = {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type StoredAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthSession = StoredAuthTokens & {
  user: AuthUser & {
    role: MobileAuthRole;
  };
};

export type AuthSessionResponse = StoredAuthTokens & {
  tokenType: "Bearer";
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  user: AuthUser;
};

export type AuthStatus = "checking" | "authenticated" | "anonymous";

export type AuthContextValue = {
  status: AuthStatus;
  session: AuthSession | null;
  login: (input: LoginRequest) => Promise<AuthSession>;
  logout: () => Promise<void>;
};
