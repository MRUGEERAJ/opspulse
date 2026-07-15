import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '../auth/AuthContext';
import { processSyncQueue } from './sync-queue.processor';
import {
  enqueueCompleteJobAction,
  markSyncQueueItemPending,
  readSyncQueue,
} from './sync-queue.storage';
import type {
  EnqueueCompleteJobInput,
  EnqueueCompleteJobResult,
  SyncQueueContextValue,
  SyncQueueItem,
  SyncQueueOwner,
} from './sync-queue.types';
import { findActiveCompleteJobAction } from './sync-queue.utils';

const SyncQueueContext = createContext<SyncQueueContextValue | null>(null);

export function SyncQueueProvider({ children }: PropsWithChildren) {
  const { authenticatedRequest, session } = useAuth();
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const owner = useMemo(
    () =>
      session
        ? {
            organizationId: session.user.organizationId,
            userId: session.user.id,
          }
        : null,
    [session],
  );
  const ownerRef = useRef<SyncQueueOwner | null>(owner);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    ownerRef.current = owner;
  }, [owner]);

  const refreshQueue = useCallback(async () => {
    if (!ownerRef.current) {
      setItems([]);
      return;
    }

    setItems(await readSyncQueue(ownerRef.current));
  }, []);

  const runProcessor = useCallback(async () => {
    const activeOwner = ownerRef.current;

    if (!activeOwner || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      const result = await processSyncQueue({
        owner: activeOwner,
        request: authenticatedRequest,
      });
      setItems(result.items);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [authenticatedRequest]);

  useEffect(() => {
    let isActive = true;

    async function loadAndProcessQueue() {
      if (!owner) {
        setItems([]);
        return;
      }

      const nextItems = await readSyncQueue(owner);

      if (!isActive) {
        return;
      }

      setItems(nextItems);

      const networkState = await NetInfo.fetch();

      if (isActive && isNetworkReachable(networkState)) {
        await runProcessor();
      }
    }

    void loadAndProcessQueue();

    return () => {
      isActive = false;
    };
  }, [owner, runProcessor]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (isNetworkReachable(state)) {
        void runProcessor();
      }
    });

    return unsubscribe;
  }, [runProcessor]);

  const enqueueCompleteJob = useCallback(
    async (
      input: EnqueueCompleteJobInput,
    ): Promise<EnqueueCompleteJobResult> => {
      if (!ownerRef.current) {
        throw new Error('Cannot queue offline actions without a session.');
      }

      const result = await enqueueCompleteJobAction(ownerRef.current, input);
      setItems(result.items);

      return result;
    },
    [],
  );

  const retryQueuedActions = useCallback(async () => {
    await runProcessor();
    await refreshQueue();
  }, [refreshQueue, runProcessor]);

  const retryQueueItem = useCallback(
    async (clientActionId: string) => {
      if (!ownerRef.current) {
        return;
      }

      const nextItems = await markSyncQueueItemPending(
        ownerRef.current,
        clientActionId,
      );
      setItems(nextItems);
      await runProcessor();
      await refreshQueue();
    },
    [refreshQueue, runProcessor],
  );

  const getQueuedCompletionForJob = useCallback(
    (jobId: string) => findActiveCompleteJobAction(items, jobId),
    [items],
  );
  const pendingCount = items.filter(item => item.status !== 'SYNCED').length;
  const failedCount = items.filter(item => item.status === 'FAILED').length;

  const value = useMemo<SyncQueueContextValue>(
    () => ({
      items,
      isProcessing,
      pendingCount,
      failedCount,
      enqueueCompleteJob,
      refreshQueue,
      retryQueuedActions,
      retryQueueItem,
      getQueuedCompletionForJob,
    }),
    [
      enqueueCompleteJob,
      failedCount,
      getQueuedCompletionForJob,
      isProcessing,
      items,
      pendingCount,
      refreshQueue,
      retryQueueItem,
      retryQueuedActions,
    ],
  );

  return (
    <SyncQueueContext.Provider value={value}>
      {children}
    </SyncQueueContext.Provider>
  );
}

export function useSyncQueue(): SyncQueueContextValue {
  const context = useContext(SyncQueueContext);

  if (!context) {
    throw new Error('useSyncQueue must be used inside SyncQueueProvider');
  }

  return context;
}

function isNetworkReachable(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}
