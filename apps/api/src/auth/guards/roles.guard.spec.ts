import assert from "node:assert/strict";
import test from "node:test";

import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";

import { UserRole } from "../../generated/prisma/enums.js";
import { RolesGuard } from "./roles.guard.js";

test("RolesGuard allows an actor with the required role", () => {
  const guard = new RolesGuard(createReflector([UserRole.ADMIN]));
  const context = createContext(UserRole.ADMIN);

  assert.equal(guard.canActivate(context), true);
});

test("RolesGuard allows a route when no roles are required", () => {
  const guard = new RolesGuard(createReflector(undefined));
  const context = createContext(UserRole.FIELD_AGENT);

  assert.equal(guard.canActivate(context), true);
});

test("RolesGuard rejects an actor without the required role", () => {
  const guard = new RolesGuard(createReflector([UserRole.ADMIN]));
  const context = createContext(UserRole.MANAGER);

  assert.throws(
    () => guard.canActivate(context),
    (error: unknown) => error instanceof ForbiddenException
  );
});

test("RolesGuard rejects a request with required roles but no actor", () => {
  const guard = new RolesGuard(createReflector([UserRole.FIELD_AGENT]));
  const context = createContext(undefined);

  assert.throws(
    () => guard.canActivate(context),
    (error: unknown) => error instanceof ForbiddenException
  );
});

function createReflector(requiredRoles: UserRole[] | undefined): Reflector {
  return {
    getAllAndOverride: () => requiredRoles
  } as unknown as Reflector;
}

function createContext(role: UserRole | undefined): ExecutionContext {
  return {
    getHandler: () => rolesTestHandler,
    getClass: () => RolesTestController,
    switchToHttp: () => ({
      getRequest: () => ({
        actor:
          role === undefined
            ? undefined
            : {
                userId: "20000000-0000-4000-8000-000000000001",
                organizationId: "10000000-0000-4000-8000-000000000001",
                email: "user@opspulse.local",
                name: "Test User",
                role
              }
      })
    })
  } as unknown as ExecutionContext;
}

function rolesTestHandler() {}
class RolesTestController {}
