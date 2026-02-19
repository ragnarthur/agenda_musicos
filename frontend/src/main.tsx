import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import { initSentry } from './utils/sentry';
import './index.css';
import App from './App.tsx';

// Initialize error tracking
initSentry();

if (import.meta.env.PROD) {
  console.debug = () => undefined;
  console.log = () => undefined;
  console.info = () => undefined;
}

// Report Core Web Vitals
const reportWebVital = ({
  name,
  value,
  rating,
}: {
  name: string;
  value: number;
  rating: string;
}) => {
  if (import.meta.env.DEV) {
    console.info(`[Web Vital] ${name}: ${Math.round(value)}ms (${rating})`);
  }
  if (!import.meta.env.PROD) return;

  const payload = JSON.stringify({
    name,
    value: Math.round(value * 100) / 100,
    rating,
    path: window.location.pathname,
    release: import.meta.env.VITE_RELEASE_LABEL || '',
    ts: new Date().toISOString(),
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    const accepted = navigator.sendBeacon('/api/vitals/', blob);
    if (accepted) return;
  }

  void fetch('/api/vitals/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
    cache: 'no-store',
  }).catch(() => undefined);
};

onCLS(reportWebVital);
onINP(reportWebVital);
onLCP(reportWebVital);
onFCP(reportWebVital);
onTTFB(reportWebVital);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
