import assert from "node:assert/strict";
import test from "node:test";

import { UserRole } from "../generated/prisma/enums.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { AuthRepository } from "./auth.repository.js";

const activeUser = {
  id: "20000000-0000-4000-8000-000000000001",
  organizationId: "10000000-0000-4000-8000-000000000001",
  email: "admin@opspulse.local",
  passwordHash: "stored-hash",
  name: "Demo Admin",
  role: UserRole.ADMIN,
  isActive: true,
  organization: {
    isActive: true
  }
};

const activeToken = {
  id: "50000000-0000-4000-8000-000000000001",
  organizationId: activeUser.organizationId,
  userId: activeUser.id,
  tokenFamilyId: "60000000-0000-4000-8000-000000000001",
  expiresAt: new Date("2026-07-23T00:00:00.000Z"),
  revokedAt: null,
  revocationReason: null,
  replacedByTokenId: null,
  user: activeUser
};

test("AuthRepository rotates a refresh token in one transaction", async () => {
  const updates: Array<Record<string, unknown>> = [];
  const transaction = {
    refreshToken: {
      findUnique: async () => activeToken,
      updateMany: async (args: Record<string, unknown>) => {
        updates.push(args);
        return { count: 1 };
      },
      create: async () => ({
        id: "50000000-0000-4000-8000-000000000002"
      }),
      update: async (args: Record<string, unknown>) => {
        updates.push(args);
        return {};
      }
    }
  };
  const repository = createRepository(transaction);

  const result = await repository.rotateRefreshToken({
    currentTokenHash: "current-hash",
    replacementTokenHash: "replacement-hash",
    now: new Date("2026-06-23T00:00:00.000Z")
  });

  assert.equal(result.status, "rotated");
  assert.equal(updates.length, 2);
  assert.deepEqual(updates[0]?.data, {
    revokedAt: new Date("2026-06-23T00:00:00.000Z"),
    revocationReason: "ROTATED"
  });
  assert.deepEqual(updates[1]?.data, {
    replacedByTokenId: "50000000-0000-4000-8000-000000000002"
  });
});

test("AuthRepository treats reuse of a rotated token as invalid and revokes its family", async () => {
  let revocationArgs: Record<string, unknown> | undefined;
  const transaction = {
    refreshToken: {
      findUnique: async () => ({
        ...activeToken,
        revokedAt: new Date("2026-06-23T00:00:00.000Z"),
        revocationReason: "ROTATED",
        replacedByTokenId: "50000000-0000-4000-8000-000000000002"
      }),
      updateMany: async (args: Record<string, unknown>) => {
        revocationArgs = args;
        return { count: 1 };
      }
    }
  };
  const repository = createRepository(transaction);

  const result = await repository.rotateRefreshToken({
    currentTokenHash: "reused-hash",
    replacementTokenHash: "unused-hash",
    now: new Date("2026-06-23T00:05:00.000Z")
  });

  assert.deepEqual(result, { status: "invalid" });
  assert.deepEqual(revocationArgs?.where, {
    tokenFamilyId: activeToken.tokenFamilyId,
    revokedAt: null
  });
  assert.deepEqual(revocationArgs?.data, {
    revokedAt: new Date("2026-06-23T00:05:00.000Z"),
    revocationReason: "REUSE_DETECTED"
  });
});

test("AuthRepository logout is idempotent for an unknown refresh token", async () => {
  let updateCalled = false;
  const prismaService = {
    refreshToken: {
      findUnique: async () => null,
      updateMany: async () => {
        updateCalled = true;
        return { count: 0 };
      }
    }
  } as unknown as PrismaService;
  const repository = new AuthRepository(prismaService);

  await repository.revokeRefreshTokenFamily(
    "unknown-hash",
    new Date("2026-06-23T00:00:00.000Z")
  );

  assert.equal(updateCalled, false);
});

function createRepository(transaction: object): AuthRepository {
  const prismaService = {
    $transaction: async (callback: (client: object) => unknown) =>
      callback(transaction)
  } as unknown as PrismaService;

  return new AuthRepository(prismaService);
}
