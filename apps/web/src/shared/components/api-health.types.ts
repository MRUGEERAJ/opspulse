import type { HealthResponse } from "@opspulse/shared";

export type HealthState =
  | { status: "loading" }
  | { status: "success"; data: HealthResponse }
  | { status: "error"; message: string };
