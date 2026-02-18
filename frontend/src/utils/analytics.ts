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
  | 'musician_profile_view';

interface EventData {
  [key: string]: string | number | boolean | undefined;
}

export function trackEvent(name: EventName, data?: EventData) {
  // Fire a DOM CustomEvent so any analytics script can listen
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('analytics', { detail: { name, ...data } }));
  }

  if (import.meta.env.DEV) {
    console.debug('[analytics]', name, data ?? '');
  }
}
