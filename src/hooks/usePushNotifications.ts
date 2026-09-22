import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from '../api';
import { colors } from '../theme';

// Foreground behavior: a wash-ready alert while the app is open should still
// show as a banner with a sound, not silently land in the tray unseen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  // Android silently drops the permission prompt without a channel to
  // attach it to — this has to exist before requesting.
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Wash updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: colors.primary,
  });
}

async function registerToken(actorId: string) {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;
  if (!projectId) return; // Expo Go / no EAS project — nothing to register against

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.registerDevice(tokenResponse.data, Platform.OS === 'ios' ? 'ios' : 'android');
}

/**
 * Registers this device's push token with the server, once per signed-in
 * actor — but only if notification permission is already granted. It never
 * itself shows the OS permission prompt: Apple review treats a permission
 * dialog appearing unprompted right after sign-in as poor UX and a common
 * rejection reason, so the actual ask lives in `requestNotificationPermission`
 * below, fired only from an explicit user action (see NotificationPrompt).
 *
 * The server (src/modules/notify) already sends a real push for
 * "ready_for_collection" and other client events — it always has. Nothing
 * ever arrived because no device had ever registered a token to send it to;
 * this is the missing other half, not a fix to the sending logic.
 */
export function usePushNotifications(actorId: string | null | undefined) {
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!actorId || registeredFor.current === actorId) return;

    (async () => {
      try {
        const existing = await Notifications.getPermissionsAsync();
        console.log('[push] permission status:', existing.status);
        if (existing.status !== 'granted') return;

        await ensureAndroidChannel();
        console.log('[push] channel ready, registering token for', actorId);
        await registerToken(actorId);
        console.log('[push] token registered successfully');
        registeredFor.current = actorId;
      } catch (e: any) {
        // TEMPORARY: surfaced while diagnosing why no token has ever reached
        // the server. Revert to a silent catch once this is resolved — a
        // phone with notifications blocked at the OS level, or offline at
        // this exact moment, should still have an app that works, falling
        // back to the in-app alert without bothering anyone.
        console.log('[push] registration FAILED:', e?.message || e, e?.code || '');
      }
    })();
  }, [actorId]);
}

/**
 * The actual permission ask — call this only from a user-initiated action
 * (a button tap, an explicit prompt the user can dismiss), never on mount
 * or automatically after sign-in. Returns the resulting status so the
 * caller can show its own feedback.
 */
export async function requestNotificationPermission(
  actorId: string
): Promise<Notifications.PermissionStatus> {
  await ensureAndroidChannel();
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status === 'granted') {
    try {
      await registerToken(actorId);
    } catch {
      // Permission granted but registration failed (offline, no EAS
      // project) — the permission itself still stands; the app will pick
      // up registration the next time usePushNotifications runs.
    }
  }
  return status;
}
