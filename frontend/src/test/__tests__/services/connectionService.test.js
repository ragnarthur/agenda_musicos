import { describe, it, expect, beforeEach, vi } from 'vitest';
import { connectionService } from '@/services/connectionService';
describe('connectionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('gets all connections', async () => {
        const connections = await connectionService.getAll();
        expect(Array.isArray(connections)).toBe(true);
        expect(connections.length).toBeGreaterThanOrEqual(0);
    });
    it('creates connection successfully', async () => {
        const newConnection = await connectionService.create({
            target_id: 2,
            connection_type: 'played_with',
            notes: 'Excelente músico!',
        });
        expect(newConnection.id).toBeDefined();
        expect(newConnection.target_id).toBe(2);
    });
    it('deletes connection successfully', async () => {
        await expect(connectionService.delete(1)).resolves.not.toThrow();
    });
});
