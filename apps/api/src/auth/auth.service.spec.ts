import assert from "node:assert/strict";
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

test("AuthService login returns a one-hour bearer token and safe user", async () => {
  const authRepository = {
    findByEmail: async () => activeUser
  } as unknown as AuthRepository;
  const passwordService = {
    verify: async () => true
  } as unknown as PasswordService;
  const jwtService = {
    signAsync: async (payload: unknown) => {
      assert.deepEqual(payload, { sub: activeUser.id });
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
  assert.equal(result.expiresIn, 3600);
  assert.equal(result.tokenType, "Bearer");
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
    JWT_ACCESS_TOKEN_TTL_SECONDS: 3600,
    JWT_SECRET: "test-secret-with-at-least-32-characters",
    JWT_ISSUER: "opspulse-api",
    JWT_AUDIENCE: "opspulse-clients"
  };

  return {
    getOrThrow: (key: string) => values[key]
  } as unknown as ConfigService;
}
