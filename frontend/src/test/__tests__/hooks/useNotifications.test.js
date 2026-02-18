import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { useNotifications, useDashboardNotifications } from '@/hooks/useNotifications';
describe('useNotifications', () => {
  beforeEach(() => {
    server.resetHandlers();
  });
  it('handles loading state correctly', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.isLoading).toBe(true);
  });
  it('loads notification counts and sets data', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.pendingMyResponse).toBeGreaterThanOrEqual(0);
    expect(result.current.pendingApproval).toBeGreaterThanOrEqual(0);
  });
  it('has mutate function available', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(typeof result.current.mutate).toBe('function');
  });
});
describe('useDashboardNotifications', () => {
  beforeEach(() => {
    server.resetHandlers();
  });
  it('handles loading state correctly', () => {
    const { result } = renderHook(() => useDashboardNotifications());
    expect(result.current.isLoading).toBe(true);
  });
  it('loads dashboard notification counts and sets data', async () => {
    const { result } = renderHook(() => useDashboardNotifications());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.pendingApprovalsCount).toBeGreaterThanOrEqual(0);
    // mockEvents: only event id=1 has availability_summary.pending > 0 and created_by=1
    expect(result.current.pendingResponsesCount).toBe(1);
  });
  it('has mutate function available', async () => {
    const { result } = renderHook(() => useDashboardNotifications());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(typeof result.current.mutate).toBe('function');
  });
});
