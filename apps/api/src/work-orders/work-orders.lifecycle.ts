import { WorkOrderStatus } from "../generated/prisma/enums.js";

const ALLOWED_TRANSITIONS: ReadonlyMap<
  WorkOrderStatus,
  ReadonlySet<WorkOrderStatus>
> = new Map([
  [
    WorkOrderStatus.CREATED,
    statusSet(
      WorkOrderStatus.ASSIGNED,
      WorkOrderStatus.CANCELLED,
      WorkOrderStatus.SLA_BREACHED
    )
  ],
  [
    WorkOrderStatus.ASSIGNED,
    statusSet(
      WorkOrderStatus.IN_PROGRESS,
      WorkOrderStatus.CANCELLED,
      WorkOrderStatus.SLA_BREACHED
    )
  ],
  [
    WorkOrderStatus.IN_PROGRESS,
    statusSet(
      WorkOrderStatus.COMPLETED,
      WorkOrderStatus.FAILED,
      WorkOrderStatus.CANCELLED,
      WorkOrderStatus.SLA_BREACHED
    )
  ],
  [
    WorkOrderStatus.SLA_BREACHED,
    statusSet(
      WorkOrderStatus.IN_PROGRESS,
      WorkOrderStatus.COMPLETED,
      WorkOrderStatus.FAILED,
      WorkOrderStatus.CANCELLED
    )
  ]
]);

const TERMINAL_STATUSES = new Set<WorkOrderStatus>([
  WorkOrderStatus.COMPLETED,
  WorkOrderStatus.FAILED,
  WorkOrderStatus.CANCELLED
]);

const REASON_REQUIRED_STATUSES = new Set<WorkOrderStatus>([
  WorkOrderStatus.FAILED,
  WorkOrderStatus.CANCELLED
]);

const PUBLICLY_SETTABLE_STATUSES = new Set<WorkOrderStatus>([
  WorkOrderStatus.IN_PROGRESS,
  WorkOrderStatus.COMPLETED,
  WorkOrderStatus.FAILED,
  WorkOrderStatus.CANCELLED
]);

export function canTransition(
  fromStatus: WorkOrderStatus,
  toStatus: WorkOrderStatus
): boolean {
  return ALLOWED_TRANSITIONS.get(fromStatus)?.has(toStatus) ?? false;
}

export function isTerminalStatus(status: WorkOrderStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function requiresStatusReason(status: WorkOrderStatus): boolean {
  return REASON_REQUIRED_STATUSES.has(status);
}

export function isPubliclySettableStatus(status: WorkOrderStatus): boolean {
  return PUBLICLY_SETTABLE_STATUSES.has(status);
}

function statusSet(...statuses: WorkOrderStatus[]): ReadonlySet<WorkOrderStatus> {
  return new Set(statuses);
}
