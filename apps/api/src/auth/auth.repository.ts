import { Injectable } from "@nestjs/common";

import type { UserRole } from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthenticatedActor } from "./auth.types.js";

const AUTH_USER_SELECT = {
  id: true,
  organizationId: true,
  email: true,
  passwordHash: true,
  name: true,
  role: true,
  isActive: true,
  organization: {
    select: {
      isActive: true
    }
  }
} as const;

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

type CreateStaffUserInput = {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
};

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.prismaService.user.findUnique({
      where: { email },
      select: AUTH_USER_SELECT
    });
  }

  findById(id: string): Promise<AuthUserRecord | null> {
    return this.prismaService.user.findUnique({
      where: { id },
      select: AUTH_USER_SELECT
    });
  }

  createStaffUser(actor: AuthenticatedActor, input: CreateStaffUserInput) {
    return this.prismaService.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          organizationId: actor.organizationId,
          name: input.name,
          email: input.email,
          passwordHash: input.passwordHash,
          role: input.role
        }
      });

      await transaction.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "USER_REGISTERED",
          targetType: "USER",
          targetId: user.id,
          metadata: {
            role: user.role
          }
        }
      });

      return user;
    });
  }
}
