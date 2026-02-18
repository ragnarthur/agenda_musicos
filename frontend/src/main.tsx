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
  // In production, send to analytics endpoint if available
  if (import.meta.env.PROD && navigator.sendBeacon) {
    navigator.sendBeacon(
      '/api/vitals/',
      JSON.stringify({ name, value: Math.round(value), rating })
    );
  }
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
