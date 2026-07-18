import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import {
  completeAssignedJob,
  getAssignedJob,
  startAssignedJob,
} from '../jobs/jobs.api';
import {
  readCachedAssignedJobs,
  upsertCachedAssignedJob,
} from '../jobs/jobs.storage';
import type { AssignedJob, AssignedJobsCacheOwner } from '../jobs/jobs.types';
import {
  canFallbackToAssignedJobsCache,
  formatJobDueDate,
  formatLastSyncedAt,
  getJobPriorityLabel,
  getJobStatusLabel,
  isCompleteJobActionAvailable,
  isStartJobActionAvailable,
} from '../jobs/jobs.utils';
import type { RootStackParamList } from '../navigation/navigation.types';
import { ApiError } from '../shared/api/api-client';
import { PrimaryButton } from '../shared/components/PrimaryButton';
import { Screen } from '../shared/components/Screen';
import { colors } from '../shared/theme';
import { useSyncQueue } from '../sync-queue/SyncQueueContext';
import {
  createClientActionId,
  isRetryableSyncError,
} from '../sync-queue/sync-queue.utils';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>;

const COMPLETION_NOTES_MIN_LENGTH = 3;

export function JobDetailScreen({ route }: Props) {
  const { authenticatedRequest, session } = useAuth();
  const { enqueueCompleteJob, getQueuedCompletionForJob } = useSyncQueue();
  const [job, setJob] = useState<AssignedJob | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [isShowingCachedData, setIsShowingCachedData] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const cacheOwner = useMemo(
    () => (session ? getAssignedJobsCacheOwner(session.user) : null),
    [session],
  );
  const queuedCompletion = job ? getQueuedCompletionForJob(job.id) : null;

  const cacheAssignedJob = useCallback(
    async (nextJob: AssignedJob) => {
      if (!cacheOwner) {
        return;
      }

      const nextLastSyncedAt = new Date().toISOString();
      setLastSyncedAt(nextLastSyncedAt);
      try {
        await upsertCachedAssignedJob(cacheOwner, nextJob, nextLastSyncedAt);
      } catch {
        // Live detail should stay usable even if cache persistence fails.
      }
    },
    [cacheOwner],
  );

  const loadJob = useCallback(async () => {
    setIsInitialLoading(true);
    setLoadErrorMessage(null);

    if (!cacheOwner) {
      setLoadErrorMessage(
        'Could not identify the current field agent session.',
      );
      setIsInitialLoading(false);
      return;
    }

    try {
      const response = await getAssignedJob(
        authenticatedRequest,
        route.params.jobId,
      );
      setJob(response);
      setIsShowingCachedData(false);
      await cacheAssignedJob(response);
    } catch (error) {
      if (canFallbackToAssignedJobsCache(error)) {
        const cachedJobs = await readCachedAssignedJobs(cacheOwner).catch(
          () => null,
        );
        const cachedJob =
          cachedJobs?.jobs.find(item => item.id === route.params.jobId) ?? null;

        if (cachedJob) {
          setJob(cachedJob);
          setLastSyncedAt(cachedJobs?.lastSyncedAt ?? null);
          setIsShowingCachedData(true);
          return;
        }

        setLoadErrorMessage(
          'Live data is unavailable, and this job is not saved on this device yet.',
        );
        return;
      }

      setIsShowingCachedData(false);
      setLoadErrorMessage(getJobDetailErrorMessage(error));
    } finally {
      setIsInitialLoading(false);
    }
  }, [authenticatedRequest, cacheAssignedJob, cacheOwner, route.params.jobId]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  async function handleStartJob() {
    setIsStartingJob(true);
    setActionMessage(null);

    if (isShowingCachedData) {
      setIsStartingJob(false);
      return;
    }

    try {
      const updatedJob = await startAssignedJob(
        authenticatedRequest,
        route.params.jobId,
      );
      setJob(updatedJob);
      await cacheAssignedJob(updatedJob);
    } catch (error) {
      setActionMessage(getJobDetailErrorMessage(error));
    } finally {
      setIsStartingJob(false);
    }
  }

  async function handleCompleteJob() {
    const notes = completionNotes.trim();

    if (
      !job ||
      isCompletingJob ||
      queuedCompletion ||
      !isCompleteJobActionAvailable(job.status) ||
      notes.length < COMPLETION_NOTES_MIN_LENGTH
    ) {
      return;
    }

    setIsCompletingJob(true);
    setActionMessage(null);
    const clientActionId = createClientActionId();

    if (isShowingCachedData) {
      try {
        await queueCompletion(notes, clientActionId, job.version);
      } catch (error) {
        setActionMessage(getJobDetailErrorMessage(error));
      }
      setIsCompletingJob(false);
      return;
    }

    try {
      const updatedJob = await completeAssignedJob(
        authenticatedRequest,
        route.params.jobId,
        { notes, clientActionId, expectedVersion: job.version },
      );
      setJob(updatedJob);
      await cacheAssignedJob(updatedJob);
      setCompletionNotes('');
      setActionMessage('Job completed.');
    } catch (error) {
      if (isRetryableSyncError(error)) {
        await queueCompletion(notes, clientActionId, job.version);
        return;
      }

      setActionMessage(getJobDetailErrorMessage(error));
    } finally {
      setIsCompletingJob(false);
    }
  }

  async function queueCompletion(
    notes: string,
    clientActionId: string,
    expectedVersion: number,
  ) {
    const result = await enqueueCompleteJob({
      jobId: route.params.jobId,
      notes,
      clientActionId,
      expectedVersion,
    });

    setCompletionNotes('');
    setActionMessage(
      result.wasCreated
        ? 'Completion queued. It will sync when the API is reachable.'
        : 'Completion is already queued for this job.',
    );
  }

  if (isInitialLoading) {
    return (
      <Screen>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.centerTitle}>Loading job detail</Text>
          <Text style={styles.centerText}>
            Fetching the latest assigned work order.
          </Text>
        </View>
      </Screen>
    );
  }

  if (!job) {
    return (
      <Screen>
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>Could not load job</Text>
          <Text style={styles.errorText}>
            {loadErrorMessage ?? 'This assigned job could not be found.'}
          </Text>
          <PrimaryButton
            label="Retry"
            onPress={() => {
              loadJob();
            }}
          />
        </View>
      </Screen>
    );
  }

  const canStartJob =
    !isShowingCachedData && isStartJobActionAvailable(job.status);
  const canCompleteJob = isCompleteJobActionAvailable(job.status);
  const completionNotesTrimmed = completionNotes.trim();
  const isCompletionNotesValid =
    completionNotesTrimmed.length >= COMPLETION_NOTES_MIN_LENGTH;
  const isCompletionDisabled =
    !canCompleteJob ||
    !isCompletionNotesValid ||
    queuedCompletion !== null ||
    isCompletingJob ||
    isStartingJob;

  return (
    <Screen>
      <Text style={styles.eyebrow}>Assigned job</Text>
      <Text style={styles.title}>{job.title}</Text>
      <Text style={styles.identifier}>Job ID: {job.id}</Text>

      {isShowingCachedData && (
        <View style={styles.savedDataBanner}>
          <Text style={styles.savedDataTitle}>Showing saved job details</Text>
          <Text style={styles.savedDataText}>
            Live data is unavailable. {formatLastSyncedAt(lastSyncedAt)}. This
            saved view can queue completion, then sync it later.
          </Text>
        </View>
      )}

      {queuedCompletion && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncTitle}>
            {getQueuedCompletionTitle(queuedCompletion.status)}
          </Text>
          <Text style={styles.syncText}>
            Attempts: {queuedCompletion.attemptCount}
            {queuedCompletion.lastError
              ? `. Last error: ${queuedCompletion.lastError}`
              : ''}
          </Text>
        </View>
      )}

      <View style={styles.summaryRow}>
        <Text style={styles.statusBadge}>{getJobStatusLabel(job.status)}</Text>
        <Text style={styles.priorityBadge}>
          {getJobPriorityLabel(job.priority)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Job details</Text>
        <DetailRow label="Site" value={job.siteAddress ?? 'No site address'} />
        <DetailRow label="Due" value={formatJobDueDate(job.dueAt)} />
        <DetailRow
          label="Description"
          value={job.description ?? 'No description provided.'}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Field requirements</Text>
        <RequirementRow
          label="Proof photo"
          isRequired={job.requiresProofPhoto}
        />
        <RequirementRow
          label="Location capture"
          isRequired={job.requiresLocation}
        />
        <RequirementRow label="QR scan" isRequired={job.requiresQrScan} />
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          disabled={
            isShowingCachedData ||
            !canStartJob ||
            isStartingJob ||
            isCompletingJob
          }
          label={isStartingJob ? 'Starting job...' : 'Start Job'}
          onPress={() => {
            handleStartJob();
          }}
        />

        {job.status === 'COMPLETED' ? (
          <View style={styles.completedCard}>
            <Text style={styles.completedTitle}>Job completed</Text>
            <Text style={styles.completedText}>
              The field agent has completed this work order.
            </Text>
          </View>
        ) : (
          <View style={styles.completionForm}>
            <Text style={styles.cardTitle}>Completion notes</Text>
            <TextInput
              editable={!queuedCompletion}
              multiline
              numberOfLines={4}
              onChangeText={setCompletionNotes}
              placeholder="What was completed?"
              placeholderTextColor={colors.muted}
              style={styles.notesInput}
              textAlignVertical="top"
              value={completionNotes}
            />
            <PrimaryButton
              disabled={isCompletionDisabled}
              label={
                queuedCompletion
                  ? 'Completion Queued'
                  : isCompletingJob
                    ? 'Completing job...'
                    : 'Complete Job'
              }
              variant="secondary"
              onPress={() => {
                handleCompleteJob();
              }}
            />
          </View>
        )}

        {isShowingCachedData && !queuedCompletion && canCompleteJob && (
          <Text style={styles.mutedText}>
            Live data is unavailable. Completing now will save a local action
            and sync it later.
          </Text>
        )}

        {!isShowingCachedData && !canStartJob && job.status !== 'COMPLETED' && (
          <Text style={styles.mutedText}>
            Start Job is available only while the backend allows this job to
            move into progress.
          </Text>
        )}

        {!isShowingCachedData &&
          !canCompleteJob &&
          job.status !== 'COMPLETED' && (
            <Text style={styles.mutedText}>
              Complete Job is available after the job is in progress.
            </Text>
          )}

        {actionMessage && (
          <View style={styles.actionMessage}>
            <Text style={styles.actionMessageText}>{actionMessage}</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

function getQueuedCompletionTitle(status: string): string {
  switch (status) {
    case 'PROCESSING':
      return 'Completion syncing';
    case 'FAILED':
      return 'Completion sync failed';
    default:
      return 'Completion queued';
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function RequirementRow({
  label,
  isRequired,
}: {
  label: string;
  isRequired: boolean;
}) {
  return (
    <View style={styles.requirementRow}>
      <Text style={styles.rowValue}>{label}</Text>
      <Text style={isRequired ? styles.requiredBadge : styles.optionalBadge}>
        {isRequired ? 'Required' : 'Not required'}
      </Text>
    </View>
  );
}

function getJobDetailErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Could not load this job. Please try again.';
}

function getAssignedJobsCacheOwner(user: {
  id: string;
  organizationId: string;
}): AssignedJobsCacheOwner {
  return {
    organizationId: user.organizationId,
    userId: user.id,
  };
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
    marginTop: 8,
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  identifier: {
    marginTop: 10,
    color: colors.muted,
  },
  savedDataBanner: {
    gap: 6,
    marginTop: 18,
    borderLeftWidth: 4,
    borderLeftColor: colors.warningText,
    borderRadius: 8,
    backgroundColor: colors.warningBackground,
    padding: 14,
  },
  savedDataTitle: {
    color: colors.warningText,
    fontWeight: '800',
  },
  savedDataText: {
    color: colors.text,
    lineHeight: 21,
  },
  syncBanner: {
    gap: 6,
    marginTop: 18,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 14,
  },
  syncTitle: {
    color: colors.primary,
    fontWeight: '800',
  },
  syncText: {
    color: colors.text,
    lineHeight: 21,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  statusBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.successBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.successText,
    fontWeight: '800',
  },
  priorityBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#eef2f1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text,
    fontWeight: '800',
  },
  card: {
    gap: 14,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 18,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  detailRow: {
    gap: 4,
  },
  rowLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  rowValue: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  requirementRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requiredBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.warningBackground,
    paddingHorizontal: 9,
    paddingVertical: 5,
    color: colors.warningText,
    fontSize: 12,
    fontWeight: '800',
  },
  optionalBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#eef2f1',
    paddingHorizontal: 9,
    paddingVertical: 5,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  actions: {
    gap: 12,
    marginTop: 24,
  },
  completionForm: {
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 16,
  },
  notesInput: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#f8faf9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  completedCard: {
    gap: 6,
    borderLeftWidth: 4,
    borderLeftColor: colors.successText,
    borderRadius: 10,
    backgroundColor: colors.successBackground,
    padding: 14,
  },
  completedTitle: {
    color: colors.successText,
    fontSize: 16,
    fontWeight: '800',
  },
  completedText: {
    color: colors.text,
    lineHeight: 21,
  },
  mutedText: {
    color: colors.muted,
    lineHeight: 21,
  },
  actionMessage: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 14,
  },
  actionMessageText: {
    color: colors.text,
    lineHeight: 21,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  centerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  centerText: {
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'center',
  },
  errorText: {
    color: colors.errorText,
    lineHeight: 21,
    textAlign: 'center',
  },
});
