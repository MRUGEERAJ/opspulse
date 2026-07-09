import type { ApiSuccessResponse } from "@opspulse/shared";

import { webEnvironment } from "../../shared/config/env";
import type {
  AuthenticatedApiRequest,
  CreateWorkOrderRequest,
  FieldAgentSummary,
  ListWorkOrdersParams,
  WorkOrder,
  WorkOrdersListMeta
} from "./work-orders.types";

export async function listWorkOrders(
  request: AuthenticatedApiRequest,
  params: ListWorkOrdersParams
): Promise<{ data: WorkOrder[]; meta: WorkOrdersListMeta }> {
  const response = await request<
    ApiSuccessResponse<WorkOrder[], WorkOrdersListMeta>
  >(`${apiPath("/work-orders")}?${toQueryString(params)}`, {
    unwrapData: false
  });

  if (!response.meta) {
    throw new Error("Work order list response did not include pagination meta.");
  }

  return {
    data: response.data,
    meta: response.meta
  };
}

export function getWorkOrder(
  request: AuthenticatedApiRequest,
  workOrderId: string
): Promise<WorkOrder> {
  return request<WorkOrder>(apiPath(`/work-orders/${workOrderId}`));
}

export function createWorkOrder(
  request: AuthenticatedApiRequest,
  input: CreateWorkOrderRequest
): Promise<WorkOrder> {
  return request<WorkOrder>(apiPath("/work-orders"), {
    method: "POST",
    body: input
  });
}

export function assignWorkOrder(
  request: AuthenticatedApiRequest,
  workOrderId: string,
  assigneeId: string
): Promise<WorkOrder> {
  return request<WorkOrder>(apiPath(`/work-orders/${workOrderId}/assign`), {
    method: "PATCH",
    body: { assigneeId }
  });
}

export function listFieldAgents(
  request: AuthenticatedApiRequest
): Promise<FieldAgentSummary[]> {
  return request<FieldAgentSummary[]>(apiPath("/users/field-agents"));
}

function apiPath(path: string): string {
  return `/${webEnvironment.apiBasePath}/${path.replace(/^\/+/, "")}`;
}

function toQueryString(params: ListWorkOrdersParams): string {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });

  if (params.status) {
    searchParams.set("status", params.status);
  }

  if (params.q) {
    searchParams.set("q", params.q);
  }

  return searchParams.toString();
}
