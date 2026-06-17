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
