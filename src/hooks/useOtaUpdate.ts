import { useEffect, useState } from 'react';
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
export function useOtaUpdate() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // In Expo Go and dev builds the JS is served by Metro, so there is no
    // update channel to query and checking would only log a confusing error.
    if (__DEV__ || !Updates.isEnabled) return;

    let cancelled = false;

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (cancelled || !check.isAvailable) return;

        await Updates.fetchUpdateAsync();
        if (cancelled) return;

        // Downloaded and staged. It takes effect on the next reload.
        setReady(true);
      } catch {
        // Offline, or the update server is unreachable. The app keeps
        // running the bundle it already has, which is the correct outcome —
        // an update failure must never be something the user has to handle.
      }
    })();

    return () => {
      cancelled = true;
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
