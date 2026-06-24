import type { UserRole } from "../generated/prisma/enums.js";

export type AuthUserRecord = {
  id: string;
  organizationId: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  organization: {
    isActive: boolean;
  };
};

export type CreateStaffUserInput = {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
};

export type CreateRefreshTokenInput = {
  organizationId: string;
  userId: string;
  tokenHash: string;
  tokenFamilyId: string;
  expiresAt: Date;
};

export type RotateRefreshTokenInput = {
  currentTokenHash: string;
  replacementTokenHash: string;
  now: Date;
};

export type RotateRefreshTokenResult =
  | {
      status: "rotated";
      user: AuthUserRecord;
      expiresAt: Date;
    }
  | {
      status: "invalid";
    };

export type AccessTokenPayload = {
  sub?: unknown;
  type?: unknown;
};

export type AuthenticatedActor = {
  userId: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
};

export type RequestWithAuthenticatedActor = {
  headers: Record<string, string | string[] | undefined>;
  actor?: AuthenticatedActor;
};

export type SafeUser = {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
};

export type AuthSessionResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  user: SafeUser;
};

export type UserForResponse = {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: SafeUser["role"];
  isActive: boolean;
};
