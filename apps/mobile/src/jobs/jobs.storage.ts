import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  AssignedJob,
  AssignedJobsCacheOwner,
  CachedAssignedJobs,
} from './jobs.types';

const ASSIGNED_JOBS_CACHE_VERSION = 1;
const ASSIGNED_JOBS_CACHE_KEY_PREFIX = 'opspulse.mobile.assignedJobs';

export async function readCachedAssignedJobs(
  owner: AssignedJobsCacheOwner,
): Promise<CachedAssignedJobs | null> {
  const storageKey = getAssignedJobsCacheKey(owner);
  const rawValue = await AsyncStorage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!isCachedAssignedJobs(parsed, owner)) {
      await AsyncStorage.removeItem(storageKey);
      return null;
    }

    return parsed;
  } catch {
    await AsyncStorage.removeItem(storageKey);
    return null;
  }
}

export async function saveCachedAssignedJobs(
  owner: AssignedJobsCacheOwner,
  jobs: AssignedJob[],
  lastSyncedAt = new Date().toISOString(),
): Promise<CachedAssignedJobs> {
  const cache: CachedAssignedJobs = {
    version: ASSIGNED_JOBS_CACHE_VERSION,
    owner,
    jobs,
    lastSyncedAt,
  };

  await AsyncStorage.setItem(
    getAssignedJobsCacheKey(owner),
    JSON.stringify(cache),
  );

  return cache;
}

export async function getCachedAssignedJob(
  owner: AssignedJobsCacheOwner,
  jobId: string,
): Promise<AssignedJob | null> {
  const cache = await readCachedAssignedJobs(owner);

  return cache?.jobs.find(job => job.id === jobId) ?? null;
}

export async function upsertCachedAssignedJob(
  owner: AssignedJobsCacheOwner,
  job: AssignedJob,
  lastSyncedAt = new Date().toISOString(),
): Promise<CachedAssignedJobs> {
  const existingCache = await readCachedAssignedJobs(owner);
  const existingJobs = existingCache?.jobs ?? [];
  const existingJobIndex = existingJobs.findIndex(item => item.id === job.id);
  const jobs =
    existingJobIndex === -1
      ? [...existingJobs, job]
      : existingJobs.map((item, index) =>
          index === existingJobIndex ? job : item,
        );

  return saveCachedAssignedJobs(owner, jobs, lastSyncedAt);
}

export function clearCachedAssignedJobs(
  owner: AssignedJobsCacheOwner,
): Promise<void> {
  return AsyncStorage.removeItem(getAssignedJobsCacheKey(owner));
}

function getAssignedJobsCacheKey(owner: AssignedJobsCacheOwner): string {
  return [
    ASSIGNED_JOBS_CACHE_KEY_PREFIX,
    `v${ASSIGNED_JOBS_CACHE_VERSION}`,
    owner.organizationId,
    owner.userId,
  ].join(':');
}

function isCachedAssignedJobs(
  value: unknown,
  owner: AssignedJobsCacheOwner,
): value is CachedAssignedJobs {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<CachedAssignedJobs>;

  return (
    candidate.version === ASSIGNED_JOBS_CACHE_VERSION &&
    isMatchingCacheOwner(candidate.owner, owner) &&
    Array.isArray(candidate.jobs) &&
    candidate.jobs.every(isAssignedJobCacheItem) &&
    typeof candidate.lastSyncedAt === 'string'
  );
}

function isMatchingCacheOwner(
  candidate: unknown,
  owner: AssignedJobsCacheOwner,
): candidate is AssignedJobsCacheOwner {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'organizationId' in candidate &&
    'userId' in candidate &&
    candidate.organizationId === owner.organizationId &&
    candidate.userId === owner.userId
  );
}

function isAssignedJobCacheItem(value: unknown): value is AssignedJob {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    typeof value.id === 'string' &&
    typeof value.title === 'string'
  );
}
