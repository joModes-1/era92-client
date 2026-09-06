import React, { ReactNode } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../theme';
import Icon from '../components/Icon';

/**
 * Shared chrome for every unauthenticated screen (login, register, reset,
 * forced password change). Deep ink field + brand blooms + one white card, so
 * the whole entry flow feels like a single product rather than four pages.
 */
export default function AuthShell({
  icon, title, subtitle, onBack, backLabel = 'Back', children, footer,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[colors.ink[900], colors.ink[950]]} style={StyleSheet.absoluteFill as any} />
      <View style={styles.bloomPink} pointerEvents="none" />
      <View style={styles.bloomOrange} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {onBack ? (
              <TouchableOpacity onPress={onBack} style={styles.back} hitSlop={10} activeOpacity={0.7}>
                <Icon name="arrow-left" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.backText}>{backLabel}</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.brand}>
              <LinearGradient
                colors={colors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logo}
              >
                <Icon name={icon} size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>

            <View style={styles.card}>{children}</View>

            {footer}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** Inline error strip shared by the auth forms. */
export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Icon name="exclamation-circle" size={12} color={colors.error} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  cardTitle: { fontSize: font.xxl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },
  cardSub: { fontSize: font.sm, color: colors.textMuted, marginTop: 3, marginBottom: spacing.xl, lineHeight: 19 },
  link: { fontSize: font.sm, fontWeight: weight.bold, color: colors.primary },
  linkBtn: { marginTop: spacing.lg, alignItems: 'center' },
  footnote: {
    fontSize: font.xs, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', marginTop: spacing.xl, lineHeight: 17,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink[950] },
  bloomPink: {
    position: 'absolute', top: -120, right: -90,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(233,30,99,0.28)',
  },
  bloomOrange: {
    position: 'absolute', bottom: -140, left: -100,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(255,107,53,0.16)',
  },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },

  back: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: spacing.xl, alignSelf: 'flex-start' },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: font.sm, fontWeight: weight.semibold },

  brand: { alignItems: 'center', marginBottom: spacing.xl },
  logo: {
    width: 58, height: 58, borderRadius: radii.xl,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.brand,
  },
  title: { fontSize: font.display, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.display, textAlign: 'center' },
  subtitle: { fontSize: font.sm, color: 'rgba(255,255,255,0.6)', marginTop: 3, textAlign: 'center' },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xxl,
    padding: spacing.xl,
    ...shadow.lg,
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.errorSoft, borderRadius: radii.sm,
    paddingVertical: 10, paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: { flex: 1, fontSize: font.sm, color: colors.error, fontWeight: weight.semibold },
});
