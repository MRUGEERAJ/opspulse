import type {
  WorkOrderPriority,
  WorkOrderStatus,
  UserRole
} from "@opspulse/shared";
import type { AuthContextValue } from "../auth/auth.types";

export type AuthenticatedApiRequest = AuthContextValue["authenticatedRequest"];

export type WorkOrder = {
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

export type WorkOrdersListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type ListWorkOrdersParams = {
  page: number;
  limit: number;
  status?: WorkOrderStatus;
  q?: string;
};

export type CreateWorkOrderRequest = {
  title: string;
  description?: string | null;
  priority?: WorkOrderPriority;
  dueAt?: string | null;
  siteAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  requiresProofPhoto?: boolean;
  requiresLocation?: boolean;
  requiresQrScan?: boolean;
};

export type FieldAgentSummary = {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: Extract<UserRole, "FIELD_AGENT">;
  isActive: boolean;
};
