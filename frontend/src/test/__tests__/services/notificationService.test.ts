import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notificationService } from '@/services/notificationService';

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets notification preferences', async () => {
    const preferences = await notificationService.getPreferences();

    expect(preferences).toBeDefined();
  });

  it('connects Telegram successfully', async () => {
    const result = await notificationService.telegramConnect();

    expect(result).toBeDefined();
  });
});
