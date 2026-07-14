import type { WorkOrderPriority, WorkOrderStatus } from '@opspulse/shared';

import { ApiError } from '../shared/api/api-client';

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  CREATED: 'Created',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  SLA_BREACHED: 'SLA Breached',
};

const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export function getJobStatusLabel(status: WorkOrderStatus): string {
  return STATUS_LABELS[status];
}

export function getJobPriorityLabel(priority: WorkOrderPriority): string {
  return PRIORITY_LABELS[priority];
}

export function formatJobDueDate(dueAt: string | null): string {
  if (!dueAt) {
    return 'No due date';
  }

  const date = new Date(dueAt);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid due date';
  }

  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatLastSyncedAt(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) {
    return 'Last sync time unavailable';
  }

  const date = new Date(lastSyncedAt);

  if (Number.isNaN(date.getTime())) {
    return 'Last sync time unavailable';
  }

  return `Last synced ${date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;
}

export function isStartJobActionAvailable(status: WorkOrderStatus): boolean {
  return status === 'ASSIGNED' || status === 'SLA_BREACHED';
}

export function isCompleteJobActionAvailable(status: WorkOrderStatus): boolean {
  return status === 'IN_PROGRESS' || status === 'SLA_BREACHED';
}

export function canFallbackToAssignedJobsCache(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  if (error.statusCode === undefined) {
    return true;
  }

  if ([401, 403, 404].includes(error.statusCode)) {
    return false;
  }

  return error.statusCode >= 500;
}
