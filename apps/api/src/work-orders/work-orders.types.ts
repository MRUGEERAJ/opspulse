import type {
  UserRole,
  WorkOrderPriority,
  WorkOrderStatus
} from "../generated/prisma/enums.js";

export type WorkOrderWriteData = {
  title?: string;
  description?: string | null;
  priority?: WorkOrderPriority;
  dueAt?: Date | null;
  siteAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  requiresProofPhoto?: boolean;
  requiresLocation?: boolean;
  requiresQrScan?: boolean;
};

export type CreateWorkOrderWriteData = WorkOrderWriteData & {
  title: string;
};

export type ListWorkOrdersInput = {
  organizationId: string;
  page: number;
  limit: number;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
};

export type ListAssignedWorkOrdersInput = ListWorkOrdersInput & {
  assigneeId: string;
};

export type WorkOrderAssignee = {
  id: string;
  organizationId: string;
  role: UserRole;
  isActive: boolean;
};

export type WorkOrderResponse = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  dueAt: string | null;
  siteAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  requiresProofPhoto: boolean;
  requiresLocation: boolean;
  requiresQrScan: boolean;
  version: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkOrderWithLocationInput = Pick<
  WorkOrderWriteData,
  "latitude" | "longitude"
>;
