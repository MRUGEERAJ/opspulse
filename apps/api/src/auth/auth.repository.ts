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

type CreateRefreshTokenInput = {
  organizationId: string;
  userId: string;
  tokenHash: string;
  tokenFamilyId: string;
  expiresAt: Date;
};

type RotateRefreshTokenInput = {
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

const REVOCATION_REASON = {
  expired: "EXPIRED",
  logout: "LOGOUT",
  rotated: "ROTATED",
  reuseDetected: "REUSE_DETECTED",
  userInactive: "USER_INACTIVE"
} as const;

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

  createRefreshToken(input: CreateRefreshTokenInput): Promise<void> {
    return this.prismaService.refreshToken
      .create({
        data: input,
        select: {
          id: true
        }
      })
      .then(() => undefined);
  }

  rotateRefreshToken(
    input: RotateRefreshTokenInput
  ): Promise<RotateRefreshTokenResult> {
    return this.prismaService.$transaction(async (transaction) => {
      const currentToken = await transaction.refreshToken.findUnique({
        where: {
          tokenHash: input.currentTokenHash
        },
        select: {
          id: true,
          organizationId: true,
          userId: true,
          tokenFamilyId: true,
          expiresAt: true,
          revokedAt: true,
          revocationReason: true,
          replacedByTokenId: true,
          user: {
            select: AUTH_USER_SELECT
          }
        }
      });

      if (!currentToken) {
        return { status: "invalid" };
      }

      if (currentToken.expiresAt <= input.now) {
        await transaction.refreshToken.updateMany({
          where: {
            tokenFamilyId: currentToken.tokenFamilyId,
            revokedAt: null
          },
          data: {
            revokedAt: input.now,
            revocationReason: REVOCATION_REASON.expired
          }
        });

        return { status: "invalid" };
      }

      if (
        !currentToken.user.isActive ||
        !currentToken.user.organization.isActive
      ) {
        await transaction.refreshToken.updateMany({
          where: {
            tokenFamilyId: currentToken.tokenFamilyId,
            revokedAt: null
          },
          data: {
            revokedAt: input.now,
            revocationReason: REVOCATION_REASON.userInactive
          }
        });

        return { status: "invalid" };
      }

      if (currentToken.revokedAt) {
        if (
          currentToken.revocationReason === REVOCATION_REASON.rotated ||
          currentToken.replacedByTokenId
        ) {
          await transaction.refreshToken.updateMany({
            where: {
              tokenFamilyId: currentToken.tokenFamilyId,
              revokedAt: null
            },
            data: {
              revokedAt: input.now,
              revocationReason: REVOCATION_REASON.reuseDetected
            }
          });
        }

        return { status: "invalid" };
      }

      const claimedToken = await transaction.refreshToken.updateMany({
        where: {
          id: currentToken.id,
          revokedAt: null,
          replacedByTokenId: null
        },
        data: {
          revokedAt: input.now,
          revocationReason: REVOCATION_REASON.rotated
        }
      });

      if (claimedToken.count !== 1) {
        await transaction.refreshToken.updateMany({
          where: {
            tokenFamilyId: currentToken.tokenFamilyId,
            revokedAt: null
          },
          data: {
            revokedAt: input.now,
            revocationReason: REVOCATION_REASON.reuseDetected
          }
        });

        return { status: "invalid" };
      }

      const replacementToken = await transaction.refreshToken.create({
        data: {
          organizationId: currentToken.organizationId,
          userId: currentToken.userId,
          tokenHash: input.replacementTokenHash,
          tokenFamilyId: currentToken.tokenFamilyId,
          expiresAt: currentToken.expiresAt
        },
        select: {
          id: true
        }
      });

      await transaction.refreshToken.update({
        where: {
          id: currentToken.id
        },
        data: {
          replacedByTokenId: replacementToken.id
        }
      });

      return {
        status: "rotated",
        user: currentToken.user,
        expiresAt: currentToken.expiresAt
      };
    });
  }

  async revokeRefreshTokenFamily(tokenHash: string, now: Date): Promise<void> {
    const token = await this.prismaService.refreshToken.findUnique({
      where: {
        tokenHash
      },
      select: {
        tokenFamilyId: true
      }
    });

    if (!token) {
      return;
    }

    await this.prismaService.refreshToken.updateMany({
      where: {
        tokenFamilyId: token.tokenFamilyId,
        revokedAt: null
      },
      data: {
        revokedAt: now,
        revocationReason: REVOCATION_REASON.logout
      }
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
