import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";

import { UserRole } from "../generated/prisma/enums.js";
import type {
  AuthRepository,
  AuthUserRecord
} from "./auth.repository.js";
import { AuthService } from "./auth.service.js";
import type { PasswordService } from "./password.service.js";

const activeUser: AuthUserRecord = {
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

test("AuthService login returns access and refresh tokens without storing plaintext", async () => {
  let storedTokenHash = "";
  const authRepository = {
    findByEmail: async () => activeUser,
    createRefreshToken: async (
      input: Parameters<AuthRepository["createRefreshToken"]>[0]
    ) => {
      storedTokenHash = input.tokenHash;
      assert.equal(input.userId, activeUser.id);
      assert.equal(input.organizationId, activeUser.organizationId);
      assert.match(input.tokenFamilyId, /^[0-9a-f-]{36}$/);
    }
  } as unknown as AuthRepository;
  const passwordService = {
    verify: async () => true
  } as unknown as PasswordService;
  const jwtService = {
    signAsync: async (payload: unknown) => {
      assert.deepEqual(payload, { sub: activeUser.id, type: "access" });
      return "signed-token";
    }
  } as unknown as JwtService;
  const configService = createConfigService();
  const service = new AuthService(
    authRepository,
    passwordService,
    jwtService,
    configService
  );

  const result = await service.login({
    email: activeUser.email,
    password: "OpsPulseTest123!"
  });

  assert.equal(result.accessToken, "signed-token");
  assert.equal(result.accessTokenExpiresIn, 900);
  assert.equal(result.refreshTokenExpiresIn, 2_592_000);
  assert.equal(result.tokenType, "Bearer");
  assert.equal(result.refreshToken.length, 64);
  assert.equal(
    storedTokenHash,
    createHash("sha256").update(result.refreshToken).digest("hex")
  );
  assert.notEqual(storedTokenHash, result.refreshToken);
  assert.equal(result.user.email, activeUser.email);
  assert.equal("passwordHash" in result.user, false);
});

test("AuthService login uses the same generic error for invalid authentication", async () => {
  const scenarios = [
    null,
    { ...activeUser, isActive: false },
    { ...activeUser, organization: { isActive: false } }
  ];

  for (const user of scenarios) {
    const service = new AuthService(
      {
        findByEmail: async () => user
      } as unknown as AuthRepository,
      {
        verify: async () => false
      } as unknown as PasswordService,
      {} as JwtService,
      createConfigService()
    );

    await assert.rejects(
      service.login({
        email: activeUser.email,
        password: "WrongPassword123!"
      }),
      (error: unknown) =>
        error instanceof UnauthorizedException &&
        error.message === "Invalid email or password"
    );
  }
});

test("AuthService refresh rotates the supplied token and preserves remaining expiry", async () => {
  const expiresAt = new Date(Date.now() + 60_000);
  let currentTokenHash = "";
  let replacementTokenHash = "";
  const authRepository = {
    rotateRefreshToken: async (
      input: Parameters<AuthRepository["rotateRefreshToken"]>[0]
    ) => {
      currentTokenHash = input.currentTokenHash;
      replacementTokenHash = input.replacementTokenHash;

      return {
        status: "rotated" as const,
        user: activeUser,
        expiresAt
      };
    }
  } as unknown as AuthRepository;
  const service = new AuthService(
    authRepository,
    {} as PasswordService,
    {
      signAsync: async () => "refreshed-access-token"
    } as unknown as JwtService,
    createConfigService()
  );

  const suppliedToken = "a".repeat(64);
  const result = await service.refresh({
    refreshToken: suppliedToken
  });

  assert.equal(
    currentTokenHash,
    createHash("sha256").update(suppliedToken).digest("hex")
  );
  assert.equal(
    replacementTokenHash,
    createHash("sha256").update(result.refreshToken).digest("hex")
  );
  assert.equal(result.accessToken, "refreshed-access-token");
  assert.ok(result.refreshTokenExpiresIn > 0);
  assert.ok(result.refreshTokenExpiresIn <= 60);
});

test("AuthService refresh returns a generic error for every invalid token state", async () => {
  const service = new AuthService(
    {
      rotateRefreshToken: async () => ({ status: "invalid" })
    } as unknown as AuthRepository,
    {} as PasswordService,
    {} as JwtService,
    createConfigService()
  );

  await assert.rejects(
    service.refresh({
      refreshToken: "unknown-token".repeat(4)
    }),
    (error: unknown) =>
      error instanceof UnauthorizedException &&
      error.message === "Invalid or expired refresh token"
  );
});

test("AuthService logout hashes the token before revoking its family", async () => {
  let revokedTokenHash = "";
  const service = new AuthService(
    {
      revokeRefreshTokenFamily: async (tokenHash: string) => {
        revokedTokenHash = tokenHash;
      }
    } as unknown as AuthRepository,
    {} as PasswordService,
    {} as JwtService,
    createConfigService()
  );
  const refreshToken = "logout-token".repeat(6);

  await service.logout({ refreshToken });

  assert.equal(
    revokedTokenHash,
    createHash("sha256").update(refreshToken).digest("hex")
  );
});

test("AuthService hashes a new staff password and returns no sensitive fields", async () => {
  let createdPasswordHash = "";
  const service = new AuthService(
    {
      createStaffUser: async (
        _actor: Parameters<AuthRepository["createStaffUser"]>[0],
        input: Parameters<AuthRepository["createStaffUser"]>[1]
      ) => {
        createdPasswordHash = input.passwordHash;

        return {
          id: "20000000-0000-4000-8000-000000000004",
          organizationId: activeUser.organizationId,
          email: input.email,
          passwordHash: input.passwordHash,
          name: input.name,
          role: input.role,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    } as unknown as AuthRepository,
    {
      hash: async () => "new-password-hash"
    } as unknown as PasswordService,
    {} as JwtService,
    createConfigService()
  );

  const result = await service.register(
    {
      userId: activeUser.id,
      organizationId: activeUser.organizationId,
      email: activeUser.email,
      name: activeUser.name,
      role: UserRole.ADMIN
    },
    {
      name: "Field Agent Two",
      email: "agent2@opspulse.local",
      password: "OpsPulseTest123!",
      role: UserRole.FIELD_AGENT
    }
  );

  assert.equal(createdPasswordHash, "new-password-hash");
  assert.equal(result.role, UserRole.FIELD_AGENT);
  assert.equal("passwordHash" in result, false);
});

function createConfigService(): ConfigService {
  const values: Record<string, string | number> = {
    JWT_ACCESS_TOKEN_TTL_SECONDS: 900,
    JWT_REFRESH_TOKEN_TTL_SECONDS: 2_592_000,
    JWT_SECRET: "test-secret-with-at-least-32-characters",
    JWT_ISSUER: "opspulse-api",
    JWT_AUDIENCE: "opspulse-clients"
  };

  return {
    getOrThrow: (key: string) => values[key]
  } as unknown as ConfigService;
}
