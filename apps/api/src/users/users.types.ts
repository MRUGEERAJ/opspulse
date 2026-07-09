import type { UserRole } from "../generated/prisma/enums.js";

export type UserSummary = {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
};
