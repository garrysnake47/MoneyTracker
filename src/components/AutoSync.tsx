'use client';

import { useEffect, useRef } from 'react';

const HOUR = 60 * 60 * 1000;
const KEY = 'mt_last_autosync';

/**
 * Background auto-sync: triggers /api/sync at most once per hour while the app is
 * open (on load if it's been >1h, then hourly). Silent — errors are ignored.
 */
export default function AutoSync() {
  const running = useRef(false);

  useEffect(() => {
    async function maybeSync(force = false) {
      if (running.current) return;
      let last = 0;
      try {
        last = Number(localStorage.getItem(KEY) || 0);
      } catch {
        /* ignore */
      }
      if (!force && Date.now() - last < HOUR) return;
      running.current = true;
      try {
        const res = await fetch('/api/sync', { method: 'POST' });
        if (res.ok) {
          try {
            localStorage.setItem(KEY, String(Date.now()));
          } catch {
            /* ignore */
          }
          // Let open pages refresh their data.
          window.dispatchEvent(new CustomEvent('mt:synced'));
        }
      } catch {
        /* ignore */
      } finally {
        running.current = false;
      }
    }

    // On load (only if stale), then hourly.
    maybeSync(false);
    const id = setInterval(() => maybeSync(true), HOUR);
    return () => clearInterval(id);
  }, []);

  return null;
}
