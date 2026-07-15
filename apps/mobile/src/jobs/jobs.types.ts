import type { WorkOrderPriority, WorkOrderStatus } from '@opspulse/shared';

import type { AuthContextValue } from '../auth/auth.types';

export type AuthenticatedApiRequest = AuthContextValue['authenticatedRequest'];

export type AssignedJob = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  dueAt: string | null;
  siteAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  requiresProofPhoto: boolean;
  requiresLocation: boolean;
  requiresQrScan: boolean;
  version: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type AssignedJobsListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type AssignedJobsResponse = {
  data: AssignedJob[];
  meta: AssignedJobsListMeta;
};

export type AssignedJobsQuery = {
  page: number;
  limit: number;
};

export type AssignedJobsCacheOwner = {
  organizationId: string;
  userId: string;
};

export type CachedAssignedJobs = {
  version: 1;
  owner: AssignedJobsCacheOwner;
  jobs: AssignedJob[];
  lastSyncedAt: string;
};

export type UpdateJobStatusRequest = {
  status: WorkOrderStatus;
};

export type CompleteJobRequest = {
  notes: string;
  clientActionId?: string;
};
