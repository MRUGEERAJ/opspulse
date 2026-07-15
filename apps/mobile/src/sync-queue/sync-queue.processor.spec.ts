import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError } from '../shared/api/api-client';
import { processSyncQueue } from './sync-queue.processor';
import { readSyncQueue, saveSyncQueue } from './sync-queue.storage';
import type {
  ProcessSyncQueueInput,
  SyncQueueItem,
  SyncQueueOwner,
} from './sync-queue.types';

const OWNER: SyncQueueOwner = {
  organizationId: 'org-1',
  userId: 'agent-1',
};

describe('sync queue processor', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('marks a pending completion action as synced after server success', async () => {
    await saveSyncQueue(OWNER, [buildQueueItem({ jobId: 'job-1' })]);
    const request = jest.fn(async () => buildAssignedJob({ id: 'job-1' }));

    const result = await processSyncQueue({
      owner: OWNER,
      request: request as ProcessSyncQueueInput['request'],
    });

    expect(result.syncedCount).toBe(1);
    expect(request).toHaveBeenCalledWith('/api/v1/work-orders/job-1/complete', {
      method: 'PATCH',
      body: {
        notes: 'Completed inspection.',
        clientActionId: 'client-action-1',
      },
    });
    await expect(readSyncQueue(OWNER)).resolves.toMatchObject([
      {
        status: 'SYNCED',
        syncedAt: expect.any(String),
      },
    ]);
  });

  it('keeps retryable failures pending for a later sync trigger', async () => {
    await saveSyncQueue(OWNER, [buildQueueItem({ jobId: 'job-1' })]);
    const request = jest.fn(async () => {
      throw new ApiError('The API request timed out.');
    });

    const result = await processSyncQueue({
      owner: OWNER,
      request: request as ProcessSyncQueueInput['request'],
    });

    expect(result.syncedCount).toBe(0);
    await expect(readSyncQueue(OWNER)).resolves.toMatchObject([
      {
        status: 'PENDING',
        attemptCount: 1,
        lastError: 'The API request timed out.',
      },
    ]);
  });

  it('marks permanent failures as failed instead of retrying forever', async () => {
    await saveSyncQueue(OWNER, [buildQueueItem({ jobId: 'job-1' })]);
    const request = jest.fn(async () => {
      throw new ApiError('Work order cannot transition.', 409);
    });

    const result = await processSyncQueue({
      owner: OWNER,
      request: request as ProcessSyncQueueInput['request'],
    });

    expect(result.failedCount).toBe(1);
    await expect(readSyncQueue(OWNER)).resolves.toMatchObject([
      {
        status: 'FAILED',
        attemptCount: 1,
        lastError: 'Work order cannot transition.',
      },
    ]);
  });

  it('pauses authentication failures without deleting the queued action', async () => {
    await saveSyncQueue(OWNER, [
      buildQueueItem({ clientActionId: 'client-action-1', jobId: 'job-1' }),
      buildQueueItem({ clientActionId: 'client-action-2', jobId: 'job-2' }),
    ]);
    const request = jest.fn(async () => {
      throw new ApiError('Your session expired.', 401);
    });

    const result = await processSyncQueue({
      owner: OWNER,
      request: request as ProcessSyncQueueInput['request'],
    });

    expect(result.processedCount).toBe(1);
    expect(request).toHaveBeenCalledTimes(1);
    await expect(readSyncQueue(OWNER)).resolves.toMatchObject([
      {
        status: 'PENDING',
        attemptCount: 1,
        lastError: 'Your session expired.',
      },
      {
        status: 'PENDING',
        attemptCount: 0,
      },
    ]);
  });
});

function buildQueueItem(input: Partial<SyncQueueItem>): SyncQueueItem {
  return {
    id: input.id ?? input.clientActionId ?? 'local-action-1',
    clientActionId: input.clientActionId ?? 'client-action-1',
    actionType: 'COMPLETE_JOB',
    entityId: input.entityId ?? input.jobId ?? 'job-1',
    jobId: input.jobId ?? 'job-1',
    payload: input.payload ?? {
      notes: 'Completed inspection.',
    },
    createdAtOnDevice:
      input.createdAtOnDevice ?? '2026-07-04T10:00:00.000Z',
    attemptCount: input.attemptCount ?? 0,
    status: input.status ?? 'PENDING',
    lastError: input.lastError ?? null,
    lastAttemptedAt: input.lastAttemptedAt ?? null,
    syncedAt: input.syncedAt ?? null,
  };
}

function buildAssignedJob(input: { id: string }) {
  return {
    id: input.id,
    organizationId: OWNER.organizationId,
    title: 'Assigned job',
    description: 'Job description',
    priority: 'HIGH',
    status: 'COMPLETED',
    dueAt: '2026-07-04T12:00:00.000Z',
    siteAddress: '101 Site Road',
    latitude: null,
    longitude: null,
    requiresProofPhoto: false,
    requiresLocation: false,
    requiresQrScan: false,
    version: 2,
    createdById: 'manager-1',
    createdAt: '2026-07-04T09:00:00.000Z',
    updatedAt: '2026-07-04T10:00:00.000Z',
  };
}
