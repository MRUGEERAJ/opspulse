import type { UserRole } from "../generated/prisma/enums.js";

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
