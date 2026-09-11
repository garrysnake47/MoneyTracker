'use client';

import { useEffect } from 'react';

// Registers the PWA service worker so the app is installable & works offline-ish.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {});

    // Registration is deferred to 'load' so it never competes with the first
    // paint — but hydration often finishes *after* 'load' has already fired,
    // in which case the listener would never run and the app would never
    // become installable.
    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);
  return null;
}
