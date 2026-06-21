import type { WorkOrder } from "../generated/prisma/client.js";

export function toWorkOrderResponse(workOrder: WorkOrder) {
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
    updatedAt: workOrder.updatedAt.toISOString()
  };
}
