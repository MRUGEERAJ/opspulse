import assert from "node:assert/strict";
import test from "node:test";

import {
  UnauthorizedException,
  type ExecutionContext
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { UserRole } from "../../generated/prisma/enums.js";
import type { AuthRepository } from "../auth.repository.js";
import type { RequestWithAuthenticatedActor } from "../auth.types.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

const secret = "test-secret-with-at-least-32-characters";
const issuer = "opspulse-api";
const audience = "opspulse-clients";
const userId = "20000000-0000-4000-8000-000000000001";

test("JwtAuthGuard verifies a token and reloads the active actor", async () => {
  const jwtService = new JwtService();
  const token = await jwtService.signAsync(
    { sub: userId },
    { secret, issuer, audience, expiresIn: 60 }
  );
  const request = createRequest(`Bearer ${token}`);
  const guard = new JwtAuthGuard(
    jwtService,
    createConfigService(),
    createRepository(true)
  );

  assert.equal(await guard.canActivate(createContext(request)), true);
  assert.equal(request.actor?.userId, userId);
  assert.equal(request.actor?.role, UserRole.ADMIN);
});

test("JwtAuthGuard rejects expired tokens and inactive users", async () => {
  const jwtService = new JwtService();
  const expiredToken = await jwtService.signAsync(
    { sub: userId },
    { secret, issuer, audience, expiresIn: -1 }
  );

  for (const [authorization, active] of [
    [`Bearer ${expiredToken}`, true],
    [
      `Bearer ${await jwtService.signAsync(
        { sub: userId },
        { secret, issuer, audience, expiresIn: 60 }
      )}`,
      false
    ]
  ] as const) {
    const guard = new JwtAuthGuard(
      jwtService,
      createConfigService(),
      createRepository(active)
    );

    await assert.rejects(
      guard.canActivate(createContext(createRequest(authorization))),
      (error: unknown) => error instanceof UnauthorizedException
    );
  }
});

function createRepository(active: boolean): AuthRepository {
  return {
    findById: async () => ({
      id: userId,
      organizationId: "10000000-0000-4000-8000-000000000001",
      email: "admin@opspulse.local",
      passwordHash: "unused",
      name: "Demo Admin",
      role: UserRole.ADMIN,
      isActive: active,
      organization: {
        isActive: true
      }
    })
  } as unknown as AuthRepository;
}

function createConfigService(): ConfigService {
  const values: Record<string, string> = {
    JWT_SECRET: secret,
    JWT_ISSUER: issuer,
    JWT_AUDIENCE: audience
  };

  return {
    getOrThrow: (key: string) => values[key]
  } as unknown as ConfigService;
}

function createRequest(
  authorization: string
): RequestWithAuthenticatedActor {
  return {
    headers: {
      authorization
    }
  };
}

function createContext(
  request: RequestWithAuthenticatedActor
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as unknown as ExecutionContext;
}
