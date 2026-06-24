const NODE_ENV_VALUES = ["development", "test", "production"] as const;
const LOG_LEVEL_VALUES = ["error", "warn", "log", "debug", "verbose"] as const;

type NodeEnv = (typeof NODE_ENV_VALUES)[number];
type LogLevel = (typeof LOG_LEVEL_VALUES)[number];

export type ApiEnvironment = Record<string, unknown> & {
  NODE_ENV: NodeEnv;
  HOST: string;
  PORT: number;
  API_PREFIX: string;
  CORS_ORIGINS: string[];
  SERVICE_NAME: string;
  LOG_LEVEL: LogLevel;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  JWT_ACCESS_TOKEN_TTL_SECONDS: number;
  JWT_REFRESH_TOKEN_TTL_SECONDS: number;
  PASSWORD_HASH_ROUNDS: number;
  DEMO_USER_PASSWORD?: string;
};

export function validateEnv(config: Record<string, unknown>): ApiEnvironment {
  const nodeEnv = readString(config, "NODE_ENV", "development").toLowerCase();
  const host = readString(config, "HOST", "127.0.0.1");
  const port = readPort(readString(config, "PORT", "3000"));
  const apiPrefix = normalizeApiPrefix(readString(config, "API_PREFIX", "api/v1"));
  const corsOrigins = readCorsOrigins(
    readString(config, "CORS_ORIGINS", "http://localhost:5173")
  );
  const serviceName = readString(config, "SERVICE_NAME", "OpsPulse API");
  const logLevel = readString(config, "LOG_LEVEL", "log").toLowerCase();
  const databaseUrl = readRequiredString(config, "DATABASE_URL");
  const jwtSecret = readRequiredString(config, "JWT_SECRET");
  const jwtIssuer = readString(config, "JWT_ISSUER", "opspulse-api");
  const jwtAudience = readString(config, "JWT_AUDIENCE", "opspulse-clients");
  const jwtAccessTokenTtlSeconds = readInteger(
    readString(config, "JWT_ACCESS_TOKEN_TTL_SECONDS", "900"),
    "JWT_ACCESS_TOKEN_TTL_SECONDS",
    60,
    86_400
  );
  const jwtRefreshTokenTtlSeconds = readInteger(
    readString(config, "JWT_REFRESH_TOKEN_TTL_SECONDS", "2592000"),
    "JWT_REFRESH_TOKEN_TTL_SECONDS",
    3_600,
    31_536_000
  );
  const passwordHashRounds = readInteger(
    readString(config, "PASSWORD_HASH_ROUNDS", "12"),
    "PASSWORD_HASH_ROUNDS",
    4,
    15
  );
  const demoUserPassword = readOptionalString(config, "DEMO_USER_PASSWORD");

  if (!isOneOf(nodeEnv, NODE_ENV_VALUES)) {
    throw new Error(`NODE_ENV must be one of: ${NODE_ENV_VALUES.join(", ")}`);
  }

  if (!isOneOf(logLevel, LOG_LEVEL_VALUES)) {
    throw new Error(`LOG_LEVEL must be one of: ${LOG_LEVEL_VALUES.join(", ")}`);
  }

  validatePostgresUrl(databaseUrl);

  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }

  if (
    demoUserPassword &&
    (demoUserPassword.length < 12 ||
      Buffer.byteLength(demoUserPassword, "utf8") > 72)
  ) {
    throw new Error(
      "DEMO_USER_PASSWORD must be at least 12 characters and at most 72 UTF-8 bytes"
    );
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    HOST: host,
    PORT: port,
    API_PREFIX: apiPrefix,
    CORS_ORIGINS: corsOrigins,
    SERVICE_NAME: serviceName,
    LOG_LEVEL: logLevel,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_ISSUER: jwtIssuer,
    JWT_AUDIENCE: jwtAudience,
    JWT_ACCESS_TOKEN_TTL_SECONDS: jwtAccessTokenTtlSeconds,
    JWT_REFRESH_TOKEN_TTL_SECONDS: jwtRefreshTokenTtlSeconds,
    PASSWORD_HASH_ROUNDS: passwordHashRounds,
    ...(demoUserPassword ? { DEMO_USER_PASSWORD: demoUserPassword } : {})
  };
}

function readCorsOrigins(value: string): string[] {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    throw new Error("CORS_ORIGINS must contain at least one origin");
  }

  for (const origin of origins) {
    let url: URL;

    try {
      url = new URL(origin);
    } catch {
      throw new Error(`CORS_ORIGINS contains an invalid origin: ${origin}`);
    }

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.origin !== origin
    ) {
      throw new Error(
        `CORS_ORIGINS entries must be HTTP(S) origins without paths: ${origin}`
      );
    }
  }

  return [...new Set(origins)];
}

function readString(
  config: Record<string, unknown>,
  key: string,
  defaultValue: string
): string {
  const value = config[key];

  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value !== "string") {
    throw new Error(`${key} must be a string`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return defaultValue;
  }

  return trimmed;
}

function readRequiredString(config: Record<string, unknown>, key: string): string {
  const value = config[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function readOptionalString(
  config: Record<string, unknown>,
  key: string
): string | undefined {
  const value = config[key];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${key} must be a string`);
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function validatePostgresUrl(value: string): void {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the postgresql:// or postgres:// protocol");
  }
}

function readPort(value: string): number {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
}

function readInteger(
  value: string,
  key: string,
  minimum: number,
  maximum: number
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${key} must be an integer between ${minimum} and ${maximum}`
    );
  }

  return parsed;
}

function normalizeApiPrefix(value: string): string {
  const apiPrefix = value.replace(/^\/+|\/+$/g, "");

  if (apiPrefix.length === 0) {
    throw new Error("API_PREFIX must not be empty");
  }

  return apiPrefix;
}

function isOneOf<T extends readonly string[]>(value: string, allowed: T): value is T[number] {
  return allowed.includes(value);
}
