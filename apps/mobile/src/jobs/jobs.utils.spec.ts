import { ApiError } from '../shared/api/api-client';
import { canFallbackToAssignedJobsCache } from './jobs.utils';

describe('assigned jobs cache fallback', () => {
  it('allows fallback when the API client cannot reach live data', () => {
    expect(
      canFallbackToAssignedJobsCache(new ApiError('Could not reach API.')),
    ).toBe(true);
  });

  it('allows fallback for server-side failures', () => {
    expect(
      canFallbackToAssignedJobsCache(new ApiError('Server error.', 500)),
    ).toBe(true);
    expect(
      canFallbackToAssignedJobsCache(new ApiError('Gateway timeout.', 504)),
    ).toBe(true);
  });

  it('blocks fallback for auth, permission, and not-found errors', () => {
    expect(
      canFallbackToAssignedJobsCache(new ApiError('Unauthorized.', 401)),
    ).toBe(false);
    expect(
      canFallbackToAssignedJobsCache(new ApiError('Forbidden.', 403)),
    ).toBe(false);
    expect(
      canFallbackToAssignedJobsCache(new ApiError('Not found.', 404)),
    ).toBe(false);
  });

  it('blocks fallback for validation and unknown non-API errors', () => {
    expect(
      canFallbackToAssignedJobsCache(new ApiError('Bad request.', 400)),
    ).toBe(false);
    expect(canFallbackToAssignedJobsCache(new Error('Unexpected'))).toBe(false);
  });
});
