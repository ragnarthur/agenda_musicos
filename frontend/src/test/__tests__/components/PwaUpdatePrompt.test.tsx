import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSW } from 'virtual:pwa-register';
import PwaUpdatePrompt from '@/components/common/PwaUpdatePrompt';
import { trackEvent } from '@/utils/analytics';

type RegisterSWOptions = {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
};

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn(),
}));

vi.mock('@/utils/analytics', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/utils/toast', () => ({
  __esModule: true,
  default: {
    dismiss: vi.fn(),
  },
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
  },
}));

describe('PwaUpdatePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading toast and tracks event when auto-update fires', async () => {
    const { showToast } = await import('@/utils/toast');
    vi.mocked(registerSW).mockImplementation((opts?: RegisterSWOptions) => {
      opts?.onNeedRefresh?.();
      return vi.fn().mockResolvedValue(undefined);
    });

    render(<PwaUpdatePrompt />);

    await waitFor(() => {
      expect(showToast.loading).toHaveBeenCalledWith('Atualizando para nova versao...');
    });

    expect(trackEvent).toHaveBeenCalledWith('pwa_auto_update_applied');
  });

  it('tracks offline-ready callback', async () => {
    vi.mocked(registerSW).mockImplementation((opts?: RegisterSWOptions) => {
      opts?.onOfflineReady?.();
      return vi.fn().mockResolvedValue(undefined);
    });

    render(<PwaUpdatePrompt />);

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('pwa_offline_ready');
    });
  });

  it('renders null (no UI elements)', () => {
    vi.mocked(registerSW).mockReturnValue(vi.fn().mockResolvedValue(undefined));
    const { container } = render(<PwaUpdatePrompt />);
    expect(container.firstChild).toBeNull();
  });
});
