/**
 * Lightweight analytics utility.
 *
 * Dispatches custom events that can be picked up by any analytics provider
 * (Plausible, GA4, etc.) once integrated. For now, logs to console in dev
 * and fires CustomEvents on `window` so future scripts can listen.
 */

type EventName =
  | 'page_view'
  | 'contact_view'
  | 'contractor_register'
  | 'quote_request'
  | 'musician_profile_view'
  | 'pwa_install_eligible'
  | 'pwa_install_banner_shown'
  | 'pwa_install_click'
  | 'pwa_install_prompt_accepted'
  | 'pwa_install_prompt_dismissed'
  | 'pwa_install_banner_dismissed'
  | 'pwa_install_ios_instructions_opened'
  | 'pwa_installed'
  | 'pwa_update_prompt_shown'
  | 'pwa_update_apply_click'
  | 'pwa_update_apply_success'
  | 'pwa_update_apply_failed'
  | 'pwa_update_prompt_dismissed'
  | 'pwa_offline_ready';

interface EventData {
  [key: string]: string | number | boolean | undefined;
}

const PWA_EVENT_PREFIX = 'pwa_';
const MAX_METADATA_KEYS = 20;

function normalizeMetadata(data?: EventData): Record<string, string | number | boolean> {
  if (!data || typeof data !== 'object') return {};

  const normalized: Record<string, string | number | boolean> = {};
  Object.entries(data)
    .slice(0, MAX_METADATA_KEYS)
    .forEach(([key, value]) => {
      if (typeof value === 'string') {
        normalized[key.slice(0, 64)] = value.slice(0, 300);
        return;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        normalized[key.slice(0, 64)] = value;
      }
    });

  return normalized;
}

function persistPwaEvent(name: EventName, data?: EventData) {
  if (typeof window === 'undefined') return;
  if (!name.startsWith(PWA_EVENT_PREFIX)) return;
  if (!import.meta.env.PROD) return;

  const payload = JSON.stringify({
    event: name,
    data: normalizeMetadata(data),
    path: window.location.pathname,
    release: import.meta.env.VITE_RELEASE_LABEL || '',
    ts: new Date().toISOString(),
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    const accepted = navigator.sendBeacon('/api/analytics/pwa/', blob);
    if (accepted) return;
  }

  void fetch('/api/analytics/pwa/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    credentials: 'include',
    keepalive: true,
    cache: 'no-store',
  }).catch(() => undefined);
}

export function trackEvent(name: EventName, data?: EventData) {
  // Fire a DOM CustomEvent so any analytics script can listen
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('analytics', { detail: { name, ...data } }));
  }

  persistPwaEvent(name, data);

  if (import.meta.env.DEV) {
    console.debug('[analytics]', name, data ?? '');
  }
}
