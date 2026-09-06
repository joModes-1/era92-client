import React, { ReactNode, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TextInputProps, TouchableOpacity,
  Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import Icon from '../Icon';
import GradientButton from '../GradientButton';

/**
 * Field — label + input with a real focus state. The focus ring is the thing
 * plain forms are always missing.
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

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        {required ? <Text style={styles.req}>REQUIRED</Text> : null}
      </View>

      <View
        style={[
          styles.inputWrap,
          focused && styles.inputWrapFocus,
          !!error && styles.inputWrapError,
          props.multiline && styles.inputWrapMultiline,
        ]}
      >
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          style={[styles.input, props.multiline && styles.inputMultiline, style]}
        />
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
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
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label.toUpperCase()}</Text> : null}
      <View style={styles.pills}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => onChange(o.value)}
              activeOpacity={0.7}
              style={[styles.pill, on && styles.pillOn]}
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
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{title}</Text>
              {subtitle ? <Text style={styles.sheetSub}>{subtitle}</Text> : null}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7, marginBottom: spacing.lg },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: {
    fontSize: font.micro, fontWeight: weight.heavy,
    color: colors.textSecondary, letterSpacing: tracking.capsWide,
  },
  req: { fontSize: font.micro, fontWeight: weight.bold, color: colors.textMuted, letterSpacing: tracking.caps },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgSunken,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapFocus: { borderColor: colors.primary, backgroundColor: colors.bgCard },
  inputWrapError: { borderColor: colors.error, backgroundColor: colors.errorSoft },
  inputWrapMultiline: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  prefix: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.textMuted },
  input: { flex: 1, paddingVertical: 13, fontSize: font.regular, color: colors.text, fontWeight: weight.medium },
  inputMultiline: { minHeight: 74, textAlignVertical: 'top' },
  hint: { fontSize: font.xs, color: colors.textMuted },
  error: { fontSize: font.xs, color: colors.error, fontWeight: weight.semibold },

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
  searchInput: { flex: 1, paddingVertical: 11, fontSize: font.regular, color: colors.text },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pillOn: { backgroundColor: colors.ink[900], borderColor: colors.ink[900] },
  pillText: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary },
  pillTextOn: { color: '#fff' },

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
    fontSize: font.xxl, fontWeight: weight.black,
    color: colors.text, letterSpacing: tracking.display,
  },
  sheetSub: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  sheetScroll: { flexGrow: 0 },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
});
