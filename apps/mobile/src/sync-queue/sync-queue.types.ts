import type { AuthenticatedApiRequest } from '../jobs/jobs.types';

export type SyncQueueOwner = {
  organizationId: string;
  userId: string;
};

export type SyncActionType = 'COMPLETE_JOB';

export type SyncQueueItemStatus =
  | 'PENDING'
  | 'SYNCING'
  | 'SYNCED'
  | 'FAILED';

export type CompleteJobSyncPayload = {
  notes: string;
};

export type CompleteJobSyncQueueItem = {
  id: string;
  clientActionId: string;
  actionType: 'COMPLETE_JOB';
  entityId: string;
  jobId: string;
  payload: CompleteJobSyncPayload;
  createdAtOnDevice: string;
  attemptCount: number;
  status: SyncQueueItemStatus;
  lastError: string | null;
  lastAttemptedAt: string | null;
  syncedAt: string | null;
};

export type SyncQueueItem = CompleteJobSyncQueueItem;

export type PersistedSyncQueue = {
  version: 1;
  owner: SyncQueueOwner;
  items: SyncQueueItem[];
  updatedAt: string;
};

export type EnqueueCompleteJobInput = {
  jobId: string;
  notes: string;
  clientActionId?: string;
  createdAtOnDevice?: string;
};

export type EnqueueCompleteJobResult = {
  item: CompleteJobSyncQueueItem;
  items: SyncQueueItem[];
  wasCreated: boolean;
};

export type ProcessSyncQueueInput = {
  owner: SyncQueueOwner;
  request: AuthenticatedApiRequest;
};

export type ProcessSyncQueueResult = {
  items: SyncQueueItem[];
  processedCount: number;
  syncedCount: number;
  failedCount: number;
};

export type SyncQueueContextValue = {
  items: SyncQueueItem[];
  isProcessing: boolean;
  pendingCount: number;
  failedCount: number;
  enqueueCompleteJob: (
    input: EnqueueCompleteJobInput,
  ) => Promise<EnqueueCompleteJobResult>;
  refreshQueue: () => Promise<void>;
  retryQueuedActions: () => Promise<void>;
  retryQueueItem: (clientActionId: string) => Promise<void>;
  getQueuedCompletionForJob: (jobId: string) => SyncQueueItem | null;
};
