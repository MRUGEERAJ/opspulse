const NODE_ENV_VALUES = ["development", "test", "production"] as const;
const LOG_LEVEL_VALUES = ["error", "warn", "log", "debug", "verbose"] as const;

type NodeEnv = (typeof NODE_ENV_VALUES)[number];
type LogLevel = (typeof LOG_LEVEL_VALUES)[number];

export type ApiEnvironment = Record<string, unknown> & {
  NODE_ENV: NodeEnv;
  HOST: string;
  PORT: number;
  API_PREFIX: string;
  SERVICE_NAME: string;
  LOG_LEVEL: LogLevel;
};

export function validateEnv(config: Record<string, unknown>): ApiEnvironment {
  const nodeEnv = readString(config, "NODE_ENV", "development").toLowerCase();
  const host = readString(config, "HOST", "127.0.0.1");
  const port = readPort(readString(config, "PORT", "3000"));
  const apiPrefix = normalizeApiPrefix(readString(config, "API_PREFIX", "api/v1"));
  const serviceName = readString(config, "SERVICE_NAME", "OpsPulse API");
  const logLevel = readString(config, "LOG_LEVEL", "log").toLowerCase();

  if (!isOneOf(nodeEnv, NODE_ENV_VALUES)) {
    throw new Error(`NODE_ENV must be one of: ${NODE_ENV_VALUES.join(", ")}`);
  }

  if (!isOneOf(logLevel, LOG_LEVEL_VALUES)) {
    throw new Error(`LOG_LEVEL must be one of: ${LOG_LEVEL_VALUES.join(", ")}`);
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    HOST: host,
    PORT: port,
    API_PREFIX: apiPrefix,
    SERVICE_NAME: serviceName,
    LOG_LEVEL: logLevel
  };
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

function readPort(value: string): number {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
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
