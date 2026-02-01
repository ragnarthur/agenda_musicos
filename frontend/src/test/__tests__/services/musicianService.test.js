import { describe, it, expect, beforeEach, vi } from 'vitest';
import { musicianService } from '@/services/musicianService';
describe('musicianService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('gets all musicians', async () => {
        const musicians = await musicianService.getAll();
        expect(Array.isArray(musicians)).toBe(true);
        expect(musicians.length).toBeGreaterThan(0);
    });
    it('gets musician by id', async () => {
        const musician = await musicianService.getById(1);
        expect(musician.id).toBe(1);
        expect(musician.full_name).toBeDefined();
    });
    it('gets current musician', async () => {
        const musician = await musicianService.getMe();
        expect(musician.id).toBeDefined();
        expect(musician.user.username).toBeDefined();
    });
    it('updates current musician', async () => {
        const updated = await musicianService.updateMe({
            bio: 'Nova bio',
            phone: '(11) 99999-9999',
        });
        expect(updated.bio).toBe('Nova bio');
        expect(updated.phone).toBe('(11) 99999-9999');
    });
    it('gets musician connections', async () => {
        const connections = await musicianService.getConnections(1);
        expect(Array.isArray(connections)).toBe(true);
    });
    it('gets musician reviews', async () => {
        const reviews = await musicianService.getReviews(1);
        expect(Array.isArray(reviews)).toBe(true);
    });
});
