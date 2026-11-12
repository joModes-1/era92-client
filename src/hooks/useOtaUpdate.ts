import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Checks for an over-the-air update in the background.
 *
 * Deliberately never blocks startup. A worker at the wash bay on a weak
 * connection has to be able to open the app and start a job; a pending
 * bundle is not worth a spinner in front of that. So this runs after the
 * UI is already interactive and only surfaces itself once a new bundle is
 * downloaded and ready.
 *
 * Nothing is applied silently either. Reloading mid-session would throw
 * away whatever the user was in the middle of — a half-filled form, an
 * open wash — so the new bundle sits ready and the app asks first.
 */
/** Re-check when the app comes back to the front, but not more often than this. */
const RECHECK_MS = 2 * 60 * 1000;

export function useOtaUpdate() {
  const [ready, setReady] = useState(false);
  const lastCheck = useRef(0);
  const busy = useRef(false);
  const staged = useRef(false);

  useEffect(() => {
    // In Expo Go and dev builds the JS is served by Metro, so there is no
    // update channel to query and checking would only log a confusing error.
    if (__DEV__ || !Updates.isEnabled) return;

    let cancelled = false;

    const check = async () => {
      // One check at a time, none once an update is already waiting, and not
      // in a tight loop if the app is switched back and forth.
      if (busy.current || staged.current || Date.now() - lastCheck.current < RECHECK_MS) return;
      busy.current = true;
      lastCheck.current = Date.now();
      try {
        const res = await Updates.checkForUpdateAsync();
        if (cancelled || !res.isAvailable) return;

        await Updates.fetchUpdateAsync();
        if (cancelled) return;

        // Downloaded and staged. It takes effect on the next reload.
        staged.current = true;
        setReady(true);
      } catch {
        // Offline, or the update server is unreachable. The app keeps
        // running the bundle it already has, which is the correct outcome —
        // an update failure must never be something the user has to handle.
      } finally {
        busy.current = false;
      }
    };

    // On start, and again each time the app returns to the front — a phone
    // app is rarely killed, so start-only checks meant updates were missed
    // until someone swiped the app away.
    check();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  /** Swap to the downloaded bundle. Restarts the app. */
  const apply = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      // If the reload fails the staged update still applies next launch.
      setReady(false);
    }
  };

  return { ready, apply };
}
