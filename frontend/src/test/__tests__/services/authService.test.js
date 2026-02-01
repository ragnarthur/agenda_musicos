import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '@/services/authService';
describe('authService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('login successfully', async () => {
        await expect(authService.login({
            username: 'valid_user',
            password: 'valid_pass',
        })).resolves.not.toThrow();
    });
    it('login fails with invalid credentials', async () => {
        await expect(authService.login({
            username: 'invalid',
            password: 'invalid',
        })).rejects.toMatchObject({
            response: {
                data: { detail: 'Invalid credentials' },
                status: 401,
            },
        });
    });
    it('logout successfully', async () => {
        await expect(authService.logout()).resolves.not.toThrow();
    });
    it('requests password reset successfully', async () => {
        const result = await authService.requestPasswordReset('test@example.com');
        expect(result).toEqual({
            message: expect.any(String),
        });
    });
    it('confirms password reset successfully', async () => {
        const result = await authService.confirmPasswordReset({
            uid: 'test-uid',
            token: 'test-token',
            new_password: 'newpassword123',
        });
        expect(result).toEqual({
            message: expect.any(String),
        });
    });
});
