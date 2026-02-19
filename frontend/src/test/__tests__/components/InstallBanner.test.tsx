import { act, fireEvent, render, screen } from '@testing-library/react';
import type { HTMLAttributes, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InstallBanner from '@/components/common/InstallBanner';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { trackEvent } from '@/utils/analytics';

vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: vi.fn(),
}));

vi.mock('@/hooks/useHaptics', () => ({
  haptics: {
    medium: vi.fn(),
    light: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/utils/analytics', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => children,
  motion: {
    div: ({ children, ...rest }: HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
}));

describe('InstallBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows banner and tracks install click', async () => {
    const promptInstall = vi.fn().mockResolvedValue(true);
    const dismissPrompt = vi.fn();

    vi.mocked(useInstallPrompt).mockReturnValue({
      canInstall: true,
      isInstalled: false,
      isIOS: false,
      isMobile: true,
      promptInstall,
      dismissPrompt,
      wasDismissed: false,
    });

    localStorage.setItem('gigflow_visit_count', '2');

    render(<InstallBanner />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getByText('Instalar GigFlow')).toBeInTheDocument();
    expect(trackEvent).toHaveBeenCalledWith('pwa_install_banner_shown', { ios: false });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Instalar' }));
    });

    expect(promptInstall).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('pwa_install_click', { ios: false });
  });

  it('tracks dismiss action', async () => {
    const dismissPrompt = vi.fn();

    vi.mocked(useInstallPrompt).mockReturnValue({
      canInstall: true,
      isInstalled: false,
      isIOS: false,
      isMobile: true,
      promptInstall: vi.fn().mockResolvedValue(false),
      dismissPrompt,
      wasDismissed: false,
    });

    localStorage.setItem('gigflow_visit_count', '2');

    render(<InstallBanner />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getByText('Instalar GigFlow')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Depois' }));

    expect(dismissPrompt).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('pwa_install_banner_dismissed');
  });
});
