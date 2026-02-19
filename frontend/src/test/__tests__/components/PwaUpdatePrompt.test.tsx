import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

vi.mock('@/hooks/useHaptics', () => ({
  haptics: {
    medium: vi.fn(),
    light: vi.fn(),
    success: vi.fn(),
  },
}));

describe('PwaUpdatePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tracks prompt display and successful update', async () => {
    const updateSW = vi.fn().mockResolvedValue(undefined);
    vi.mocked(registerSW).mockImplementation((opts?: RegisterSWOptions) => {
      opts?.onNeedRefresh?.();
      return updateSW;
    });

    render(<PwaUpdatePrompt />);

    await waitFor(() => {
      expect(screen.getByText('Atualizacao disponivel')).toBeInTheDocument();
    });

    expect(trackEvent).toHaveBeenCalledWith('pwa_update_prompt_shown');

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }));

    await waitFor(() => {
      expect(updateSW).toHaveBeenCalledWith(true);
    });

    expect(trackEvent).toHaveBeenCalledWith('pwa_update_apply_click');
    expect(trackEvent).toHaveBeenCalledWith('pwa_update_apply_success');
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
});
