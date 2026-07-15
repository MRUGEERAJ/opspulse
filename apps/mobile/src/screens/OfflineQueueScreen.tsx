import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '../shared/components/PrimaryButton';
import { Screen } from '../shared/components/Screen';
import { colors } from '../shared/theme';
import { useSyncQueue } from '../sync-queue/SyncQueueContext';
import type { SyncQueueItem } from '../sync-queue/sync-queue.types';

export function OfflineQueueScreen() {
  const {
    failedCount,
    isProcessing,
    items,
    pendingCount,
    refreshQueue,
    retryQueueItem,
    retryQueuedActions,
  } = useSyncQueue();

  useFocusEffect(
    useCallback(() => {
      refreshQueue();
    }, [refreshQueue]),
  );

  return (
    <Screen>
      <Text style={styles.eyebrow}>Offline-first foundation</Text>
      <Text style={styles.title}>Offline Queue</Text>
      <Text style={styles.description}>
        Local completion actions waiting for server confirmation.
      </Text>

      <View style={styles.summary}>
        <SummaryItem label="Open" value={String(pendingCount)} />
        <SummaryItem label="Failed" value={String(failedCount)} />
      </View>

      <PrimaryButton
        disabled={isProcessing || pendingCount === 0}
        label={isProcessing ? 'Syncing...' : 'Retry Sync'}
        onPress={() => {
          retryQueuedActions();
        }}
      />

      {isProcessing && (
        <View style={styles.processingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.processingText}>Processing queued actions</Text>
        </View>
      )}

      <View style={styles.listContent}>
        {items.length === 0 ? (
          <EmptyQueueState />
        ) : (
          items.map(item => (
            <QueueItemCard
              key={item.clientActionId}
              item={item}
              onRetry={() => {
                retryQueueItem(item.clientActionId);
              }}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function QueueItemCard({
  item,
  onRetry,
}: {
  item: SyncQueueItem;
  onRetry: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Complete job</Text>
        <Text style={getStatusStyle(item.status)}>{formatStatus(item)}</Text>
      </View>

      <DetailRow label="Job ID" value={item.jobId} />
      <DetailRow label="Client action" value={item.clientActionId} />
      <DetailRow label="Created" value={formatDate(item.createdAtOnDevice)} />
      <DetailRow label="Attempts" value={String(item.attemptCount)} />

      {item.lastError && <Text style={styles.errorText}>{item.lastError}</Text>}

      {item.status === 'FAILED' && (
        <PrimaryButton
          label="Retry item"
          variant="secondary"
          onPress={onRetry}
        />
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function EmptyQueueState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No queued actions</Text>
      <Text style={styles.emptyText}>
        Offline completions will appear here until the backend confirms them.
      </Text>
    </View>
  );
}

function formatStatus(item: SyncQueueItem): string {
  switch (item.status) {
    case 'SYNCING':
      return 'Syncing';
    case 'SYNCED':
      return 'Synced';
    case 'FAILED':
      return 'Failed';
    default:
      return 'Pending';
  }
}

function getStatusStyle(status: SyncQueueItem['status']) {
  if (status === 'FAILED') {
    return styles.failedBadge;
  }

  if (status === 'SYNCED') {
    return styles.syncedBadge;
  }

  return styles.pendingBadge;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 6,
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  description: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  summary: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 14,
  },
  summaryItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 14,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  summaryLabel: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  processingRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  processingText: {
    color: colors.muted,
    fontWeight: '700',
  },
  listContent: {
    gap: 12,
    paddingTop: 18,
    paddingBottom: 24,
  },
  card: {
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  pendingBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.warningBackground,
    paddingHorizontal: 9,
    paddingVertical: 5,
    color: colors.warningText,
    fontSize: 12,
    fontWeight: '800',
  },
  syncedBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.successBackground,
    paddingHorizontal: 9,
    paddingVertical: 5,
    color: colors.successText,
    fontSize: 12,
    fontWeight: '800',
  },
  failedBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.errorBackground,
    paddingHorizontal: 9,
    paddingVertical: 5,
    color: colors.errorText,
    fontSize: 12,
    fontWeight: '800',
  },
  detailRow: {
    gap: 3,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: colors.errorText,
    lineHeight: 21,
  },
  emptyState: {
    gap: 8,
    marginTop: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 12,
    padding: 24,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.muted,
    lineHeight: 22,
  },
});
