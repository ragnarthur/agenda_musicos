import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { useMusicians } from '@/hooks/useMusicians';
describe('useMusicians', () => {
  beforeEach(() => {
    server.resetHandlers();
  });
  it('handles loading state correctly', () => {
    const { result } = renderHook(() => useMusicians());
    expect(result.current.isLoading).toBe(true);
  });
  it('loads musicians and sets data', async () => {
    const { result } = renderHook(() => useMusicians());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.musicians).toBeDefined();
    expect(result.current.musicians.length).toBeGreaterThanOrEqual(0);
  });
  it('has mutate function available', async () => {
    const { result } = renderHook(() => useMusicians());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(typeof result.current.mutate).toBe('function');
  });
});
