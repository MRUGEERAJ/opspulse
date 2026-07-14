import type { WorkOrder } from "../generated/prisma/client.js";
import type { WorkOrderResponse } from "./work-orders.types.js";

type WorkOrderWithCurrentAssignment = WorkOrder & {
  assignments?: Array<{
    id: string;
    assigneeId: string;
    assignedAt: Date;
    assignee: {
      id: string;
      email: string;
      name: string;
    };
  }>;
};

export function toWorkOrderResponse(
  workOrder: WorkOrderWithCurrentAssignment
): WorkOrderResponse {
  const currentAssignment = workOrder.assignments?.[0] ?? null;

  return {
    id: workOrder.id,
    organizationId: workOrder.organizationId,
    title: workOrder.title,
    description: workOrder.description,
    priority: workOrder.priority,
    status: workOrder.status,
    dueAt: workOrder.dueAt?.toISOString() ?? null,
    siteAddress: workOrder.siteAddress,
    latitude: workOrder.latitude?.toNumber() ?? null,
    longitude: workOrder.longitude?.toNumber() ?? null,
    requiresProofPhoto: workOrder.requiresProofPhoto,
    requiresLocation: workOrder.requiresLocation,
    requiresQrScan: workOrder.requiresQrScan,
    version: workOrder.version,
    createdById: workOrder.createdById,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
    currentAssignment: currentAssignment
      ? {
          id: currentAssignment.id,
          assigneeId: currentAssignment.assigneeId,
          assignedAt: currentAssignment.assignedAt.toISOString(),
          assignee: currentAssignment.assignee
        }
      : null
  };
}
