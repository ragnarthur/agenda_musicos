import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { useConnections } from '@/hooks/useConnections';
describe('useConnections', () => {
    beforeEach(() => {
        server.resetHandlers();
    });
    it('handles loading state correctly', () => {
        const { result } = renderHook(() => useConnections());
        expect(result.current.isLoading).toBe(true);
    });
    it('loads connections and sets data', async () => {
        const { result } = renderHook(() => useConnections());
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
        expect(result.current.connections).toBeDefined();
        expect(result.current.connections.length).toBeGreaterThanOrEqual(0);
    });
    it('has mutate function available', async () => {
        const { result } = renderHook(() => useConnections());
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
        expect(typeof result.current.mutate).toBe('function');
    });
});
