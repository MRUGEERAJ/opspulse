import type { UserRole } from "../../generated/prisma/enums.js";

export type DevelopmentActor = {
  userId: string;
  organizationId: string;
  role: UserRole;
};

export type RequestWithDevelopmentActor = {
  headers: Record<string, string | string[] | undefined>;
  actor?: DevelopmentActor;
};
