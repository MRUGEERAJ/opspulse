import type { HealthResponse } from "@opspulse/shared";

import { apiGet } from "./api-client";

export function getApiHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>("/health");
}
