import type { ApiSuccessResponse } from "@opspulse/shared";

import type {
  AssignedJob,
  AssignedJobsQuery,
  AssignedJobsResponse,
  AssignedJobsListMeta,
  AuthenticatedApiRequest,
  UpdateJobStatusRequest
} from "./jobs.types";

const API_BASE_PATH = "/api/v1";

export async function listAssignedJobs(
  request: AuthenticatedApiRequest,
  query: AssignedJobsQuery
): Promise<AssignedJobsResponse> {
  const response = await request<
    ApiSuccessResponse<AssignedJob[], AssignedJobsListMeta>
  >(`${apiPath("/work-orders/assigned/me")}?${toQueryString(query)}`, {
    unwrapData: false
  });

  if (!response.meta) {
    throw new Error("Assigned jobs response did not include pagination meta.");
  }

  return {
    data: response.data,
    meta: response.meta
  };
}

export function getAssignedJob(
  request: AuthenticatedApiRequest,
  jobId: string
): Promise<AssignedJob> {
  return request<AssignedJob>(apiPath(`/work-orders/assigned/me/${jobId}`));
}

export function startAssignedJob(
  request: AuthenticatedApiRequest,
  jobId: string
): Promise<AssignedJob> {
  const body: UpdateJobStatusRequest = {
    status: "IN_PROGRESS"
  };

  return request<AssignedJob>(apiPath(`/work-orders/${jobId}/status`), {
    method: "PATCH",
    body
  });
}

function apiPath(path: string): string {
  return `${API_BASE_PATH}/${path.replace(/^\/+/, "")}`;
}

function toQueryString(query: AssignedJobsQuery): string {
  return new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit)
  }).toString();
}
