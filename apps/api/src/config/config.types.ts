export type NodeEnv = "development" | "test" | "production";

export type LogLevel = "error" | "warn" | "log" | "debug" | "verbose";

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
