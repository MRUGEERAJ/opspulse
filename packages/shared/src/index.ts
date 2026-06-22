export const OPSPULSE_APP = {
  name: "OpsPulse",
  sharedPackage: "@opspulse/shared"
} as const;

export const USER_ROLES = ["ADMIN", "MANAGER", "FIELD_AGENT"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const WORK_ORDER_STATUSES = [
  "CREATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];

export type HealthResponse = {
  status: "ok";
  service: string;
  sharedPackage: string;
  environment: string;
  timestamp: string;
};

export type ApiErrorResponse = {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
};
