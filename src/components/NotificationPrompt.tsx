import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../theme';
import Icon from './Icon';
import { requestNotificationPermission } from '../hooks/usePushNotifications';

const DISMISSED_KEY = 'notificationPromptDismissed';

/**
 * The actual notification permission ask, gated behind a tap.
 *
 * `usePushNotifications` deliberately never shows the OS permission dialog
 * itself — Apple review treats that dialog appearing unprompted right after
 * sign-in as poor UX, a common rejection reason. This card is the explicit
 * user action that stands in front of it instead: shown once per device
 * (tracked locally, not per actor, since the OS permission itself is
 * per-device) and dismissed for good once the person taps either button.
 */
export default function NotificationPrompt({ actorId }: { actorId: string | null | undefined }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!actorId) return;
    (async () => {
      const [dismissed, existing] = await Promise.all([
        AsyncStorage.getItem(DISMISSED_KEY),
        Notifications.getPermissionsAsync(),
      ]);
      // Nothing to ask if it's already been decided, one way or the other.
      if (dismissed || existing.status === 'granted' || existing.status === 'denied') return;
      setVisible(true);
    })();
  }, [actorId]);

  const dismiss = async () => {
    setVisible(false);
    await AsyncStorage.setItem(DISMISSED_KEY, '1');
  };

  const enable = async () => {
    if (!actorId) return;
    await requestNotificationPermission(actorId);
    await dismiss();
  };

  if (!visible) return null;

  return (
    <View style={s.card}>
      <View style={s.icon}>
        <Icon name="bell" size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>Get notified when a car is ready</Text>
        <Text style={s.body}>Turn on notifications to know the moment a wash is done.</Text>
        <View style={s.row}>
          <TouchableOpacity onPress={enable} activeOpacity={0.8} style={s.enableBtn}>
            <Text style={s.enableText}>Turn on</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={dismiss} activeOpacity={0.6} style={s.skipBtn}>
            <Text style={s.skipText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  icon: {
    width: 34, height: 34, borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: font.sm, fontWeight: weight.bold, color: colors.text, letterSpacing: tracking.tight },
  body: { fontSize: font.xs, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  enableBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  enableText: { fontSize: font.xs, fontWeight: weight.bold, color: '#fff' },
  skipBtn: { paddingVertical: 7, paddingHorizontal: 4 },
  skipText: { fontSize: font.xs, fontWeight: weight.semibold, color: colors.textMuted },
});
