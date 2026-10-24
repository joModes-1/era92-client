import React, { ReactNode, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TextInputProps, TouchableOpacity,
  Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, font, spacing, weight, tracking, shadow, noFocusRing, staffType, staffText } from '../../theme';
import Icon from '../Icon';
import { useIsStaff } from './useIsStaff';
import GradientButton from '../GradientButton';
import { AlertHost } from '../AppAlert';

/**
 * Field — label + input with a real focus state, styled like the client's
 * booking form: a sentence-case label above a white field with a hairline
 * border that turns violet on focus and red on error. A required field is
 * marked with an asterisk after its label rather than a second shouted word.
 */
export function Field({
  label, hint, error, required, prefix, style, ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  // Callers pass `style={{ marginBottom: 0 }}` to close the gap under the
  // last field in a sheet. That belongs to the field, not the text inside
  // it — forwarded whole to the TextInput, it silently did nothing.
  const { marginTop, marginBottom, ...inputStyle } = (StyleSheet.flatten(style) || {}) as any;
  const staff = useIsStaff();

  return (
    <View style={[styles.field, marginTop != null && { marginTop }, marginBottom != null && { marginBottom }]}>
      <Text style={staff ? styles.labelStaff : styles.label}>
        {label}
        {required ? <Text style={styles.req} accessibilityLabel="required"> *</Text> : null}
      </Text>

      <View
        style={[
          styles.inputWrap,
          focused && styles.inputWrapFocus,
          !!error && styles.inputWrapError,
          props.multiline && styles.inputWrapMultiline,
          props.editable === false && styles.inputWrapLocked,
        ]}
      >
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          style={[styles.input, staff && styles.inputStaff, props.multiline && styles.inputMultiline, inputStyle]}
        />
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={staff ? styles.hintStaff : styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

/** Search bar with a leading glyph and a clear button. */
export function SearchField({
  value, onChangeText, placeholder,
}: { value: string; onChangeText: (t: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, focused && styles.inputWrapFocus]}>
      <Icon name="search" size={13} color={focused ? colors.primary : colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.searchInput}
        autoCorrect={false}
      />
      {value.length > 0 ? (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={10}>
          <Icon name="times-circle" size={13} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Segmented pill picker — replaces stacks of tap-to-select rows. */
export function PillPicker<T extends string>({
  label, options, value, onChange,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T | '';
  onChange: (v: T) => void;
}) {
  // Staff get large tiles instead of pills — targets a gloved or wet thumb
  // can hit (STAFF-UI-SPEC.md: 48 dp minimum, categories as big tiles).
  const staff = useIsStaff();
  if (staff) {
    return (
      <View style={styles.field}>
        {label ? <Text style={styles.labelStaff}>{label}</Text> : null}
        <View style={styles.tiles}>
          {options.map((o) => {
            const on = value === o.value;
            return (
              <TouchableOpacity
                key={o.value}
                onPress={() => onChange(o.value)}
                activeOpacity={0.7}
                style={[styles.tile, on && styles.tileOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.tileText, on && styles.tileTextOn]} numberOfLines={2}>{o.label}</Text>
                {on ? <Icon name="check-circle" size={14} color={colors.primary} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.pills}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => onChange(o.value)}
              activeOpacity={0.7}
              style={[styles.pill, on && styles.pillOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.pillText, on && styles.pillTextOn]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/**
 * FormSheet — one bottom sheet used by every create/edit flow, so all the
 * modals in the app share a grabber, title, scroll behaviour and footer.
 */
export function FormSheet({
  visible, onClose, title, subtitle, children, submitLabel = 'Save', onSubmit, submitting, danger,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  submitLabel?: string;
  onSubmit: () => void;
  submitting?: boolean;
  danger?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const staff = useIsStaff();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        // 'undefined' on Android left the keyboard to simply overlap the
        // sheet with no resize or pan at all, burying whatever field was
        // focused. 'height' shrinks the KeyboardAvoidingView itself so the
        // sheet's ScrollView and footer buttons stay above the keyboard,
        // matching what 'padding' already did on iOS.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
          <View
            style={[
              styles.sheet,
              // Android draws edge-to-edge by default, so with no bottom
              // inset here the Cancel/Save row sat flush against — and was
              // partly covered by — the system gesture bar or 3-button nav.
              { paddingBottom: spacing.xl + insets.bottom },
            ]}
          >
            <View style={styles.grabber} />

            <View style={styles.sheetHead}>
              <Text style={staff ? styles.sheetTitleStaff : styles.sheetTitle}>{title}</Text>
              {subtitle ? <Text style={staff ? styles.sheetSubStaff : styles.sheetSub}>{subtitle}</Text> : null}
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={{ paddingBottom: spacing.sm }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            <View style={styles.sheetActions}>
              <GradientButton title="Cancel" variant="ghost" onPress={onClose} />
              <GradientButton
                title={submitLabel}
                variant={danger ? 'danger' : 'primary'}
                onPress={onSubmit}
                loading={submitting}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* An Android Modal is a separate native window: nothing outside it can
          paint over it, whatever the zIndex. Hosting the alert here means a
          validation message raised from this sheet appears ON the sheet
          rather than being trapped behind it. Renders nothing when idle. */}
      <AlertHost />
    </Modal>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, marginBottom: spacing.lg },
  label: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.textSecondary },
  labelStaff: { ...staffType.label, color: staffText.secondary },
  req: { color: colors.errorText, fontWeight: weight.bold },

  // A constant 1.5 border whose colour changes, so focusing a field never
  // nudges the layout by half a pixel.
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inputWrapFocus: { borderColor: colors.primary },
  inputWrapError: { borderColor: colors.error, backgroundColor: colors.errorSoft },
  inputWrapMultiline: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  inputWrapLocked: { backgroundColor: colors.bgSunken, borderColor: colors.bgSunken },
  prefix: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.textMuted },
  input: { flex: 1, paddingVertical: 13, fontSize: font.regular, color: colors.text, fontWeight: weight.medium, ...noFocusRing },
  inputMultiline: { minHeight: 74, textAlignVertical: 'top' },
  hint: { fontSize: font.xs, color: colors.textMuted, lineHeight: 16 },
  hintStaff: { ...staffType.meta },
  inputStaff: { fontSize: 16, fontWeight: weight.regular },
  error: { fontSize: font.xs, color: colors.errorText, fontWeight: weight.semibold },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: font.regular, color: colors.text, ...noFocusRing },

  // Selected = filled violet, as the client's car-type and colour chips do.
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: radii.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary },
  pillTextOn: { color: '#fff' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '48%', flexGrow: 1, minHeight: 52,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  tileOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tileText: { ...staffType.label, fontSize: 15, flex: 1 },
  tileTextOn: { color: colors.primaryText },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,14,28,0.55)' },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
    ...shadow.lg,
  },
  grabber: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg,
  },
  sheetHead: { marginBottom: spacing.lg },
  sheetTitle: {
    fontSize: font.xl, fontWeight: weight.heavy,
    color: colors.text, letterSpacing: tracking.tight,
  },
  sheetSub: { fontSize: font.sm, color: colors.textMuted, marginTop: 3 },
  sheetTitleStaff: { fontSize: 20, lineHeight: 26, fontWeight: weight.bold, color: colors.text },
  sheetSubStaff: { ...staffType.meta, marginTop: 3 },
  sheetScroll: { flexGrow: 0 },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
});
