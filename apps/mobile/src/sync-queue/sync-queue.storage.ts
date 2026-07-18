import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  CompleteJobSyncQueueItem,
  EnqueueCompleteJobInput,
  EnqueueCompleteJobResult,
  PersistedSyncQueue,
  SyncQueueItem,
  SyncQueueOwner,
} from './sync-queue.types';
import {
  createClientActionId,
  findActiveCompleteJobAction,
} from './sync-queue.utils';

const SYNC_QUEUE_VERSION = 1;
const SYNC_QUEUE_KEY_PREFIX = 'opspulse.mobile.syncQueue';

export async function readSyncQueue(
  owner: SyncQueueOwner,
): Promise<SyncQueueItem[]> {
  const storageKey = getSyncQueueKey(owner);
  const rawValue = await AsyncStorage.getItem(storageKey);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!isPersistedSyncQueue(parsed, owner)) {
      await AsyncStorage.removeItem(storageKey);
      return [];
    }

    const items = parsed.items.map(normalizeSyncQueueItem);

    if (items.some((item, index) => item !== parsed.items[index])) {
      await saveSyncQueue(owner, items);
    }

    return items;
  } catch {
    await AsyncStorage.removeItem(storageKey);
    return [];
  }
}

export async function saveSyncQueue(
  owner: SyncQueueOwner,
  items: SyncQueueItem[],
  updatedAt = new Date().toISOString(),
): Promise<SyncQueueItem[]> {
  const queue: PersistedSyncQueue = {
    version: SYNC_QUEUE_VERSION,
    owner,
    items,
    updatedAt,
  };

  await AsyncStorage.setItem(getSyncQueueKey(owner), JSON.stringify(queue));

  return items;
}

export async function enqueueCompleteJobAction(
  owner: SyncQueueOwner,
  input: EnqueueCompleteJobInput,
): Promise<EnqueueCompleteJobResult> {
  const existingItems = await readSyncQueue(owner);
  const existingItem = findActiveCompleteJobAction(
    existingItems,
    input.jobId,
  ) as CompleteJobSyncQueueItem | null;

  if (existingItem) {
    return {
      item: existingItem,
      items: existingItems,
      wasCreated: false,
    };
  }

  const createdAtOnDevice =
    input.createdAtOnDevice ?? new Date().toISOString();
  const clientActionId = input.clientActionId ?? createClientActionId();
  const item: CompleteJobSyncQueueItem = {
    id: clientActionId,
    clientActionId,
    actionType: 'COMPLETE_JOB',
    entityId: input.jobId,
    jobId: input.jobId,
    payload: {
      notes: input.notes,
      ...(input.expectedVersion !== undefined
        ? { expectedVersion: input.expectedVersion }
        : {}),
    },
    createdAtOnDevice,
    attemptCount: 0,
    status: 'PENDING',
    failureKind: null,
    lastError: null,
    lastAttemptedAt: null,
    syncedAt: null,
  };
  const nextItems = [...existingItems, item];

  await saveSyncQueue(owner, nextItems);

  return {
    item,
    items: nextItems,
    wasCreated: true,
  };
}

export async function updateSyncQueueItem(
  owner: SyncQueueOwner,
  clientActionId: string,
  updateItem: (item: SyncQueueItem) => SyncQueueItem,
): Promise<SyncQueueItem[]> {
  const items = await readSyncQueue(owner);
  const nextItems = items.map(item =>
    item.clientActionId === clientActionId ? updateItem(item) : item,
  );

  return saveSyncQueue(owner, nextItems);
}

export async function markSyncQueueItemPending(
  owner: SyncQueueOwner,
  clientActionId: string,
): Promise<SyncQueueItem[]> {
  return updateSyncQueueItem(owner, clientActionId, item => ({
    ...item,
    status: 'PENDING',
    failureKind: null,
    lastError: null,
  }));
}

export async function discardSyncQueueItem(
  owner: SyncQueueOwner,
  clientActionId: string,
): Promise<SyncQueueItem[]> {
  const items = await readSyncQueue(owner);
  const nextItems = items.filter(
    item => item.clientActionId !== clientActionId,
  );

  return saveSyncQueue(owner, nextItems);
}

export async function getActiveCompleteJobAction(
  owner: SyncQueueOwner,
  jobId: string,
): Promise<SyncQueueItem | null> {
  return findActiveCompleteJobAction(await readSyncQueue(owner), jobId);
}

function getSyncQueueKey(owner: SyncQueueOwner): string {
  return [
    SYNC_QUEUE_KEY_PREFIX,
    `v${SYNC_QUEUE_VERSION}`,
    owner.organizationId,
    owner.userId,
  ].join(':');
}

function isPersistedSyncQueue(
  value: unknown,
  owner: SyncQueueOwner,
): value is PersistedSyncQueue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<PersistedSyncQueue>;

  return (
    candidate.version === SYNC_QUEUE_VERSION &&
    isMatchingOwner(candidate.owner, owner) &&
    Array.isArray(candidate.items) &&
    candidate.items.every(isSyncQueueItem) &&
    typeof candidate.updatedAt === 'string'
  );
}

function isMatchingOwner(
  candidate: unknown,
  owner: SyncQueueOwner,
): candidate is SyncQueueOwner {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'organizationId' in candidate &&
    'userId' in candidate &&
    candidate.organizationId === owner.organizationId &&
    candidate.userId === owner.userId
  );
}

function isSyncQueueItem(value: unknown): value is SyncQueueItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<SyncQueueItem>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.clientActionId === 'string' &&
    candidate.actionType === 'COMPLETE_JOB' &&
    typeof candidate.entityId === 'string' &&
    typeof candidate.jobId === 'string' &&
    typeof candidate.payload === 'object' &&
    candidate.payload !== null &&
    typeof candidate.payload.notes === 'string' &&
    (!('expectedVersion' in candidate.payload) ||
      candidate.payload.expectedVersion === undefined ||
      typeof candidate.payload.expectedVersion === 'number') &&
    typeof candidate.createdAtOnDevice === 'string' &&
    typeof candidate.attemptCount === 'number' &&
    isSyncQueueStatus(candidate.status) &&
    (!('failureKind' in candidate) ||
      candidate.failureKind === null ||
      isSyncFailureKind(candidate.failureKind)) &&
    (candidate.lastError === null || typeof candidate.lastError === 'string') &&
    (candidate.lastAttemptedAt === null ||
      typeof candidate.lastAttemptedAt === 'string') &&
    (candidate.syncedAt === null || typeof candidate.syncedAt === 'string')
  );
}

function isSyncQueueStatus(value: unknown): boolean {
  return (
    value === 'PENDING' ||
    value === 'PROCESSING' ||
    value === 'SYNCING' ||
    value === 'SYNCED' ||
    value === 'FAILED'
  );
}

function isSyncFailureKind(value: unknown): boolean {
  return (
    value === 'RETRYABLE' ||
    value === 'CONFLICT' ||
    value === 'VALIDATION' ||
    value === 'FORBIDDEN'
  );
}

function normalizeSyncQueueItem(item: SyncQueueItem): SyncQueueItem {
  const legacyStatus = item.status as SyncQueueItem['status'] | 'SYNCING';
  const status = legacyStatus === 'SYNCING' ? 'PROCESSING' : item.status;
  const failureKind =
    'failureKind' in item && item.failureKind !== undefined
      ? item.failureKind
      : null;

  if (status === item.status && failureKind === item.failureKind) {
    return item;
  }

  return {
    ...item,
    status,
    failureKind,
  };
}
