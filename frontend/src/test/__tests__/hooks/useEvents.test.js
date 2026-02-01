import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { useEvents, usePendingMyResponse } from '@/hooks/useEvents';
describe('useEvents', () => {
    beforeEach(() => {
        server.resetHandlers();
    });
    it('handles loading state correctly', () => {
        const { result } = renderHook(() => useEvents());
        expect(result.current.isLoading).toBe(true);
    });
    it('loads events and sets data', async () => {
        const { result } = renderHook(() => useEvents());
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
        expect(result.current.events).toBeDefined();
        expect(result.current.count).toBeDefined();
    });
    it('has loadMore function available', async () => {
        const { result } = renderHook(() => useEvents());
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
        expect(typeof result.current.loadMore).toBe('function');
    });
});
describe('usePendingMyResponse', () => {
    beforeEach(() => {
        server.resetHandlers();
    });
    it('handles loading state correctly', () => {
        const { result } = renderHook(() => usePendingMyResponse());
        expect(result.current.isLoading).toBe(true);
    });
    it('loads events and sets data', async () => {
        const { result } = renderHook(() => usePendingMyResponse());
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
        expect(result.current.events).toBeDefined();
        expect(result.current.count).toBeDefined();
    });
});
