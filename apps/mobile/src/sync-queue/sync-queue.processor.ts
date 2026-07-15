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
      status: 'SYNCING',
      attemptCount: current.attemptCount + 1,
      lastAttemptedAt: new Date().toISOString(),
      lastError: null,
    }));

    try {
      const updatedJob = await completeAssignedJob(input.request, item.jobId, {
        notes: item.payload.notes,
        clientActionId: item.clientActionId,
      });
      const syncedAt = new Date().toISOString();

      await upsertCachedAssignedJob(input.owner, updatedJob, syncedAt);
      await updateSyncQueueItem(input.owner, item.clientActionId, current => ({
        ...current,
        status: 'SYNCED',
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
          lastError,
        }));
        break;
      }

      if (isRetryableSyncError(error)) {
        await updateSyncQueueItem(input.owner, item.clientActionId, current => ({
          ...current,
          status: 'PENDING',
          lastError,
        }));
        continue;
      }

      await updateSyncQueueItem(input.owner, item.clientActionId, current => ({
        ...current,
        status: 'FAILED',
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
    item.status === 'SYNCING'
      ? {
          ...item,
          status: 'PENDING' as const,
          lastError: 'Sync was interrupted before the server confirmed it.',
        }
      : item,
  );

  if (resetItems.some((item, index) => item !== items[index])) {
    await saveSyncQueue(owner, resetItems);
  }

  return resetItems;
}
