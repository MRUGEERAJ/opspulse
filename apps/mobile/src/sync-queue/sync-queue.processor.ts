import { completeAssignedJob } from '../jobs/jobs.api';
import { upsertCachedAssignedJob } from '../jobs/jobs.storage';
import {
  readSyncQueue,
  saveSyncQueue,
  updateSyncQueueItem,
} from './sync-queue.storage';
import type {
  ProcessSyncQueueInput,
  ProcessSyncQueueResult,
  SyncQueueItem,
} from './sync-queue.types';
import {
  getSyncFailureKind,
  getSyncErrorMessage,
  isAuthenticationSyncError,
  isRetryableSyncError,
} from './sync-queue.utils';

export async function processSyncQueue(
  input: ProcessSyncQueueInput,
): Promise<ProcessSyncQueueResult> {
  const startingItems = await resetStaleSyncingItems(input.owner);
  const processableItems = startingItems
    .filter(item => item.status === 'PENDING')
    .sort((first, second) =>
      first.createdAtOnDevice.localeCompare(second.createdAtOnDevice),
    );

  let processedCount = 0;
  let syncedCount = 0;
  let failedCount = 0;

  for (const item of processableItems) {
    processedCount += 1;

    await updateSyncQueueItem(input.owner, item.clientActionId, current => ({
      ...current,
      status: 'PROCESSING',
      attemptCount: current.attemptCount + 1,
      lastAttemptedAt: new Date().toISOString(),
      failureKind: null,
      lastError: null,
    }));

    try {
      const updatedJob = await completeAssignedJob(input.request, item.jobId, {
        notes: item.payload.notes,
        clientActionId: item.clientActionId,
        expectedVersion: item.payload.expectedVersion,
      });
      const syncedAt = new Date().toISOString();

      await upsertCachedAssignedJob(input.owner, updatedJob, syncedAt);
      await updateSyncQueueItem(input.owner, item.clientActionId, current => ({
        ...current,
        status: 'SYNCED',
        failureKind: null,
        lastError: null,
        syncedAt,
      }));
      syncedCount += 1;
    } catch (error) {
      const lastError = getSyncErrorMessage(error);

      if (isAuthenticationSyncError(error)) {
        await updateSyncQueueItem(input.owner, item.clientActionId, current => ({
          ...current,
          status: 'PENDING',
          failureKind: null,
          lastError,
        }));
        break;
      }

      if (isRetryableSyncError(error)) {
        await updateSyncQueueItem(input.owner, item.clientActionId, current => ({
          ...current,
          status: 'PENDING',
          failureKind: 'RETRYABLE',
          lastError,
        }));
        continue;
      }

      await updateSyncQueueItem(input.owner, item.clientActionId, current => ({
        ...current,
        status: 'FAILED',
        failureKind: getSyncFailureKind(error),
        lastError,
      }));
      failedCount += 1;
    }
  }

  return {
    items: await readSyncQueue(input.owner),
    processedCount,
    syncedCount,
    failedCount,
  };
}

async function resetStaleSyncingItems(
  owner: ProcessSyncQueueInput['owner'],
): Promise<SyncQueueItem[]> {
  const items = await readSyncQueue(owner);
  const resetItems = items.map(item =>
    item.status === 'PROCESSING'
      ? {
          ...item,
          status: 'PENDING' as const,
          failureKind: 'RETRYABLE' as const,
          lastError: 'Sync was interrupted before the server confirmed it.',
        }
      : item,
  );

  if (resetItems.some((item, index) => item !== items[index])) {
    await saveSyncQueue(owner, resetItems);
  }

  return resetItems;
}
