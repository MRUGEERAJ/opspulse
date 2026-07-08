import assert from "node:assert/strict";
import test from "node:test";

import { validateEnv } from "./env.validation.js";

test("validateEnv accepts exact comma-separated CORS origins", () => {
  const env = validateEnv({
    ...baseConfig(),
    CORS_ORIGINS: "http://localhost:5173, http://127.0.0.1:5173"
  });

  assert.deepEqual(env.CORS_ORIGINS, [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]);
});

test("validateEnv deduplicates CORS origins", () => {
  const env = validateEnv({
    ...baseConfig(),
    CORS_ORIGINS: "http://localhost:5173,http://localhost:5173"
  });

  assert.deepEqual(env.CORS_ORIGINS, ["http://localhost:5173"]);
});

test("validateEnv rejects CORS origins with paths", () => {
  assert.throws(
    () =>
      validateEnv({
        ...baseConfig(),
        CORS_ORIGINS: "http://localhost:5173/app"
      }),
    /CORS_ORIGINS entries must be HTTP\(S\) origins without paths/
  );
});

test("validateEnv rejects non-HTTP CORS origins", () => {
  assert.throws(
    () =>
      validateEnv({
        ...baseConfig(),
        CORS_ORIGINS: "file://localhost"
      }),
    /CORS_ORIGINS entries must be HTTP\(S\) origins without paths/
  );
});

test("validateEnv keeps JWT settings strict", () => {
  assert.throws(
    () =>
      validateEnv({
        ...baseConfig(),
        JWT_SECRET: "short-secret"
      }),
    /JWT_SECRET must contain at least 32 characters/
  );

  assert.throws(
    () =>
      validateEnv({
        ...baseConfig(),
        JWT_ACCESS_TOKEN_TTL_SECONDS: "59"
      }),
    /JWT_ACCESS_TOKEN_TTL_SECONDS must be an integer between 60 and 86400/
  );
});

function baseConfig(): Record<string, string> {
  return {
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: "3000",
    API_PREFIX: "api/v1",
    CORS_ORIGINS: "http://localhost:5173",
    SERVICE_NAME: "OpsPulse API",
    LOG_LEVEL: "log",
    REQUEST_BODY_LIMIT: "1mb",
    DATABASE_URL: "postgresql://opspulse:opspulse_dev@localhost:5432/opspulse",
    JWT_SECRET: "test-secret-with-at-least-32-characters",
    JWT_ISSUER: "opspulse-api",
    JWT_AUDIENCE: "opspulse-clients",
    JWT_ACCESS_TOKEN_TTL_SECONDS: "900",
    JWT_REFRESH_TOKEN_TTL_SECONDS: "2592000",
    PASSWORD_HASH_ROUNDS: "12",
    DEMO_USER_PASSWORD: "OpsPulseDemo123!"
  };
}
