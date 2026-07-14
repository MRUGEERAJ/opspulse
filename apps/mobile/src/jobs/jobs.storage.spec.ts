import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AssignedJob, AssignedJobsCacheOwner } from './jobs.types';
import {
  clearCachedAssignedJobs,
  getCachedAssignedJob,
  readCachedAssignedJobs,
  saveCachedAssignedJobs,
  upsertCachedAssignedJob,
} from './jobs.storage';

const OWNER: AssignedJobsCacheOwner = {
  organizationId: 'org-1',
  userId: 'agent-1',
};

const OTHER_OWNER: AssignedJobsCacheOwner = {
  organizationId: 'org-1',
  userId: 'agent-2',
};

const CACHE_KEY = 'opspulse.mobile.assignedJobs:v1:org-1:agent-1';

describe('assigned jobs storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('saves and reads versioned assigned jobs cache', async () => {
    const job = buildAssignedJob({ id: 'job-1', title: 'Repair pump' });

    await saveCachedAssignedJobs(OWNER, [job], '2026-07-03T10:30:00.000Z');

    await expect(readCachedAssignedJobs(OWNER)).resolves.toEqual({
      version: 1,
      owner: OWNER,
      jobs: [job],
      lastSyncedAt: '2026-07-03T10:30:00.000Z',
    });
  });

  it('scopes cache reads by organization and user', async () => {
    await saveCachedAssignedJobs(OWNER, [
      buildAssignedJob({ id: 'job-1', title: 'Repair pump' }),
    ]);

    await expect(readCachedAssignedJobs(OTHER_OWNER)).resolves.toBeNull();
  });

  it('clears corrupted JSON and returns no cache', async () => {
    await AsyncStorage.setItem(CACHE_KEY, '{broken-json');

    await expect(readCachedAssignedJobs(OWNER)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(CACHE_KEY)).resolves.toBeNull();
  });

  it('clears unsupported cache versions and returns no cache', async () => {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        version: 2,
        owner: OWNER,
        jobs: [],
        lastSyncedAt: '2026-07-03T10:30:00.000Z',
      }),
    );

    await expect(readCachedAssignedJobs(OWNER)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(CACHE_KEY)).resolves.toBeNull();
  });

  it('replaces an existing cached job during upsert', async () => {
    const originalJob = buildAssignedJob({
      id: 'job-1',
      title: 'Repair pump',
      version: 1,
    });
    const updatedJob = buildAssignedJob({
      id: 'job-1',
      title: 'Repair pump motor',
      version: 2,
    });

    await saveCachedAssignedJobs(OWNER, [originalJob]);
    const cache = await upsertCachedAssignedJob(
      OWNER,
      updatedJob,
      '2026-07-03T11:00:00.000Z',
    );

    expect(cache.jobs).toEqual([updatedJob]);
    expect(cache.lastSyncedAt).toBe('2026-07-03T11:00:00.000Z');
  });

  it('appends a newly fetched detail job during upsert', async () => {
    const firstJob = buildAssignedJob({ id: 'job-1', title: 'Repair pump' });
    const secondJob = buildAssignedJob({ id: 'job-2', title: 'Inspect valve' });

    await saveCachedAssignedJobs(OWNER, [firstJob]);
    await upsertCachedAssignedJob(OWNER, secondJob);

    await expect(getCachedAssignedJob(OWNER, 'job-2')).resolves.toEqual(
      secondJob,
    );
  });

  it("clears the current owner's assigned jobs cache", async () => {
    await saveCachedAssignedJobs(OWNER, [
      buildAssignedJob({ id: 'job-1', title: 'Repair pump' }),
    ]);

    await clearCachedAssignedJobs(OWNER);

    await expect(readCachedAssignedJobs(OWNER)).resolves.toBeNull();
  });
});

function buildAssignedJob(input: Partial<AssignedJob>): AssignedJob {
  return {
    id: input.id ?? 'job-1',
    organizationId: input.organizationId ?? OWNER.organizationId,
    title: input.title ?? 'Assigned job',
    description: input.description ?? 'Job description',
    priority: input.priority ?? 'HIGH',
    status: input.status ?? 'ASSIGNED',
    dueAt: input.dueAt ?? '2026-07-03T12:00:00.000Z',
    siteAddress: input.siteAddress ?? '101 Site Road',
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    requiresProofPhoto: input.requiresProofPhoto ?? false,
    requiresLocation: input.requiresLocation ?? false,
    requiresQrScan: input.requiresQrScan ?? false,
    version: input.version ?? 1,
    createdById: input.createdById ?? 'manager-1',
    createdAt: input.createdAt ?? '2026-07-03T09:00:00.000Z',
    updatedAt: input.updatedAt ?? '2026-07-03T09:00:00.000Z',
  };
}
