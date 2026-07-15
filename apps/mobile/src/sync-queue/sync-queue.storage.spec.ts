import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  enqueueCompleteJobAction,
  readSyncQueue,
  saveSyncQueue,
} from './sync-queue.storage';
import type { SyncQueueItem, SyncQueueOwner } from './sync-queue.types';

const OWNER: SyncQueueOwner = {
  organizationId: 'org-1',
  userId: 'agent-1',
};

const OTHER_OWNER: SyncQueueOwner = {
  organizationId: 'org-1',
  userId: 'agent-2',
};

const CACHE_KEY = 'opspulse.mobile.syncQueue:v1:org-1:agent-1';

describe('sync queue storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('saves and reads a versioned queue scoped by owner', async () => {
    const item = buildQueueItem({ jobId: 'job-1' });

    await saveSyncQueue(OWNER, [item], '2026-07-04T10:00:00.000Z');

    await expect(readSyncQueue(OWNER)).resolves.toEqual([item]);
    await expect(readSyncQueue(OTHER_OWNER)).resolves.toEqual([]);
  });

  it('prevents duplicate active completion actions for the same job', async () => {
    const first = await enqueueCompleteJobAction(OWNER, {
      jobId: 'job-1',
      notes: 'Completed inspection.',
      createdAtOnDevice: '2026-07-04T10:00:00.000Z',
    });
    const second = await enqueueCompleteJobAction(OWNER, {
      jobId: 'job-1',
      notes: 'Completed inspection again.',
      createdAtOnDevice: '2026-07-04T10:01:00.000Z',
    });

    expect(first.wasCreated).toBe(true);
    expect(second.wasCreated).toBe(false);
    expect(second.item.clientActionId).toBe(first.item.clientActionId);
    await expect(readSyncQueue(OWNER)).resolves.toHaveLength(1);
  });

  it('allows a new completion action after the previous one synced', async () => {
    await saveSyncQueue(OWNER, [
      buildQueueItem({ jobId: 'job-1', status: 'SYNCED' }),
    ]);

    const result = await enqueueCompleteJobAction(OWNER, {
      jobId: 'job-1',
      notes: 'Completed follow-up work.',
    });

    expect(result.wasCreated).toBe(true);
    expect(result.items).toHaveLength(2);
  });

  it('clears corrupted JSON and returns an empty queue', async () => {
    await AsyncStorage.setItem(CACHE_KEY, '{broken-json');

    await expect(readSyncQueue(OWNER)).resolves.toEqual([]);
    await expect(AsyncStorage.getItem(CACHE_KEY)).resolves.toBeNull();
  });
});

function buildQueueItem(input: Partial<SyncQueueItem>): SyncQueueItem {
  return {
    id: input.id ?? 'local-action-1',
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
