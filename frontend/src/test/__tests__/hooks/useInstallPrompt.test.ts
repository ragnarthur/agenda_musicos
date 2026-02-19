import { act, renderHook, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { trackEvent } from '@/utils/analytics';

vi.mock('@/utils/analytics', () => ({
  trackEvent: vi.fn(),
}));

const originalUserAgent = navigator.userAgent;

function setUserAgent(value: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    value,
    configurable: true,
  });
}

describe('useInstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setUserAgent('Mozilla/5.0 (Linux; Android 14)');
  });

  afterAll(() => {
    setUserAgent(originalUserAgent);
  });

  it('does not enable install on Android without beforeinstallprompt', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isIOS).toBe(false);
    expect(result.current.canInstall).toBe(false);
  });

  it('enables install on iOS without beforeinstallprompt', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isIOS).toBe(true);
    expect(result.current.canInstall).toBe(true);
  });

  it('tracks accepted install prompt flow', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome: 'accepted' as const });

    const { result } = renderHook(() => useInstallPrompt());

    const beforeInstallEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    };
    Object.assign(beforeInstallEvent, { prompt, userChoice });

    act(() => {
      window.dispatchEvent(beforeInstallEvent);
    });

    await waitFor(() => {
      expect(result.current.canInstall).toBe(true);
    });

    let accepted = false;
    await act(async () => {
      accepted = await result.current.promptInstall();
    });

    expect(accepted).toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('pwa_install_eligible');
    expect(trackEvent).toHaveBeenCalledWith('pwa_install_prompt_accepted');
  });
});
