import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { useInstruments } from '@/hooks/useInstruments';

describe('useInstruments', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('loads instruments successfully', async () => {
    const { result } = renderHook(() => useInstruments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.instruments).toBeDefined();
    expect(result.current.instruments.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  it('handles loading state correctly', () => {
    const { result } = renderHook(() => useInstruments());

    expect(result.current.loading).toBe(true);
  });
});
