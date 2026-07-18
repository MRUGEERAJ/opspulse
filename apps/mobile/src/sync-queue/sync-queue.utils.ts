import { ApiError } from '../shared/api/api-client';
import type { SyncFailureKind, SyncQueueItem } from './sync-queue.types';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export function createClientActionId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  const timestampPart = Date.now().toString(36);

  return `offline-${timestampPart}-${randomPart}`;
}

export function findActiveCompleteJobAction(
  items: SyncQueueItem[],
  jobId: string,
): SyncQueueItem | null {
  return (
    items.find(
      item =>
        item.actionType === 'COMPLETE_JOB' &&
        item.jobId === jobId &&
        item.status !== 'SYNCED',
    ) ?? null
  );
}

export function isRetryableSyncError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  if (error.statusCode === undefined) {
    return true;
  }

  return RETRYABLE_STATUS_CODES.has(error.statusCode);
}

export function isAuthenticationSyncError(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 401;
}

export function getSyncFailureKind(error: unknown): SyncFailureKind {
  if (isRetryableSyncError(error)) {
    return 'RETRYABLE';
  }

  if (error instanceof ApiError) {
    if (error.statusCode === 409) {
      return 'CONFLICT';
    }

    if (error.statusCode === 403) {
      return 'FORBIDDEN';
    }

    if (error.statusCode === 400) {
      return 'VALIDATION';
    }
  }

  return 'VALIDATION';
}

export function getSyncErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Could not sync this action. Please try again.';
}
