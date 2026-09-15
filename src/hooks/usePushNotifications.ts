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

/**
 * Asks for notification permission and registers this device's push token
 * with the server, once per signed-in actor.
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
        if (Platform.OS === 'android') {
          // Android silently drops the permission prompt without a channel
          // to attach it to — this has to exist before requesting.
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Wash updates',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: colors.primary,
          });
        }

        const existing = await Notifications.getPermissionsAsync();
        let status = existing.status;
        if (status !== 'granted') {
          const requested = await Notifications.requestPermissionsAsync();
          status = requested.status;
        }
        // Declined is a normal, final answer — the app still works without
        // it, just without a tray notification for a car being ready.
        if (status !== 'granted') return;

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          (Constants as any).easConfig?.projectId;
        if (!projectId) return; // Expo Go / no EAS project — nothing to register against

        const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });

        await api.registerDevice(tokenResponse.data, Platform.OS === 'ios' ? 'ios' : 'android');
        registeredFor.current = actorId;
      } catch {
        // Never block sign-in on this — a phone with notifications blocked
        // at the OS level, or offline at this exact moment, still has an app
        // that works; it just falls back to the in-app alert as before.
      }
    })();
  }, [actorId]);
}
