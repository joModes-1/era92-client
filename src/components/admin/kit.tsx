import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, weight, tint, soft, staffType, noFocusRing, jk } from '../../theme';
import CssGradient from '../CssGradient';
import Icon from './LineIcon';

/**
 * The admin app's building blocks, after the "Lovable" artboard of the
 * Era92 admin design canvas: soft white cards with a violet shadow and no
 * outline, colour-tinted tiles with the icon on a white chip, pill chips and
 * buttons that fill with the brand gradient when on, and rounded gradient
 * bars. Every colour is a theme token (`tint`, `soft`, the brand gradient),
 * so these sit with the rest of 92 CarWash.
 */

const tabular = staffType.tabular;
export type TintTone = keyof typeof tint;

/** The brand gradient, flat across: violet into navy, as on the sidebar's active row. */
function Brand({ style, children, vertical }: { style?: ViewStyle | ViewStyle[]; children?: ReactNode; vertical?: boolean }) {
  return (
    <CssGradient
      colors={colors.gradientButton2}
      locations={vertical ? [0, 1] : colors.gradientButton2Locations}
      angle={vertical ? 180 : colors.gradientButton2Angle}
      style={style as any}
    >
      {children}
    </CssGradient>
  );
}

/** Status pills. `info` is the brand purple; `blue` is for neutral progress (washing). */
export type PillTone = 'bad' | 'warn' | 'ok' | 'info' | 'blue' | 'neutral';
const PILL: Record<PillTone, TintTone> = {
  bad: 'error', warn: 'warning', ok: 'success', info: 'primary', blue: 'info', neutral: 'neutral',
};

export function Pill({ tone = 'info', label, icon }: { tone?: PillTone; label: string; icon?: string }) {
  const t = tint[PILL[tone]];
  return (
    <View style={[s.pill, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={10} color={t.text} /> : null}
      <Text style={[s.pillText, { color: t.text }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function Card({ children, style, flush }: { children: ReactNode; style?: ViewStyle | ViewStyle[]; flush?: boolean }) {
  return <View style={[s.card, flush && s.cardFlush, style as any]}>{children}</View>;
}

/** A group heading ("Needs attention"), with an optional pill or link on the right. */
export function Section({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={s.secRow}>
      <Text style={s.sec}>{title}</Text>
      {right}
    </View>
  );
}

/** Two columns of equal cards. */
export function Grid2({ children }: { children: ReactNode }) {
  const items = React.Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r, i) => (
        <View key={i} style={s.g2Row}>
          {r.map((c, j) => <View key={j} style={{ flex: 1 }}>{c}</View>)}
          {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

/** A round (or rounded-square) icon on a tint — the leading mark of rows and cards. */
export function IconChip({ icon, tone = 'primary', size = 40, square, onWhite }: {
  icon: string; tone?: TintTone; size?: number; square?: boolean; onWhite?: boolean;
}) {
  const t = tint[tone];
  return (
    <View style={{
      width: size, height: size, borderRadius: square ? size * 0.32 : size / 2,
      backgroundColor: onWhite ? '#fff' : t.bg, alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={icon} size={Math.round(size * 0.42)} color={t.fg} />
    </View>
  );
}

/** A tinted figure: icon and label, the number large, a supporting line. */
export function Tile({ icon, tone = 'primary', label, value, sub, valueColor, subColor, small }: {
  icon?: string; tone?: TintTone; label: string; value: string; sub?: string;
  valueColor?: string; subColor?: string; small?: boolean;
}) {
  return (
    <View style={[s.tile, { backgroundColor: tint[tone].bg }]}>
      <View style={s.tileHead}>
        {icon ? <IconChip icon={icon} tone={tone} size={32} square onWhite /> : null}
        <Text style={[s.tileLabel, !icon && s.tileLabelPlain]} numberOfLines={1}>{label}</Text>
      </View>
      <Text
        style={[s.tileValue, small && s.tileValueSmall, valueColor ? { color: valueColor } : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
      {sub ? <Text style={[s.tileSub, subColor ? { color: subColor } : null]} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

/** A figure in a grid — a Tile without an icon unless one is given. */
export function Stat({ label, value, sub, valueColor, subColor, icon, tone = 'primary' }: {
  label: string; value: string; sub?: string; valueColor?: string; subColor?: string; icon?: string; tone?: TintTone;
}) {
  return <Tile icon={icon} tone={tone} label={label} value={value} sub={sub} valueColor={valueColor} subColor={subColor} small />;
}

/** A row inside a flush card: optional leading slot, title + small line, trailing slot. */
export function Row({ leading, title, sub, trailing, onPress, last, chevron, titleStyle, children }: {
  leading?: ReactNode; title: string; sub?: string; trailing?: ReactNode; onPress?: () => void;
  last?: boolean; chevron?: boolean; titleStyle?: TextStyle; children?: ReactNode;
}) {
  const Wrap: any = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} activeOpacity={0.7} style={[s.row, last && s.rowLast]} accessibilityRole={onPress ? 'button' : undefined}>
      {leading}
      <View style={{ flex: 1 }}>
        <Text style={[s.rowT, titleStyle]} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={s.rowSub} numberOfLines={2}>{sub}</Text> : null}
        {children}
      </View>
      {trailing}
      {chevron ? <Icon name="chevron-right" size={14} color={colors.textSecondary} /> : null}
    </Wrap>
  );
}

export function Amount({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[s.amt, style]} numberOfLines={1}>{children}</Text>;
}

/** A soft violet pill; when on it fills with the brand gradient. */
export function Chip({ label, on, onPress, caret }: { label: string; on?: boolean; onPress: () => void; caret?: boolean }) {
  const inner = (
    <>
      <Text style={[s.chipText, on && s.chipTextOn]} numberOfLines={1}>{label}</Text>
      {caret ? <Icon name="chevron-down" size={11} color={on ? '#fff' : soft.text} /> : null}
    </>
  );
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ selected: !!on }}>
      {on ? <Brand style={s.chip}>{inner}</Brand> : <View style={[s.chip, s.chipOff]}>{inner}</View>}
    </TouchableOpacity>
  );
}

/** A row of chips that scrolls sideways when there are more than fit. */
export function Chips({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipsScroll}>
      {children}
    </ScrollView>
  );
}

/** One choice of a few — drawn as the design's filter chips. */
export function Seg<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <Chips>
      {options.map((o) => <Chip key={o.value} label={o.label} on={o.value === value} onPress={() => onChange(o.value)} />)}
    </Chips>
  );
}

/** The gradient button, and its quiet soft-violet partner. */
export function Btn({ title, onPress, primary, icon, danger, style, disabled }: {
  title: string; onPress: () => void; primary?: boolean; icon?: string; danger?: boolean; style?: ViewStyle; disabled?: boolean;
}) {
  const fg = primary ? '#fff' : danger ? tint.error.text : soft.text;
  const content = (
    <View style={s.btnInner}>
      {icon ? <Icon name={icon} size={15} color={fg} /> : null}
      <Text style={[s.btnText, { color: fg }]} numberOfLines={1}>{title}</Text>
    </View>
  );
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85} style={[disabled && { opacity: 0.45 }, style]} accessibilityRole="button">
      {primary ? (
        <View style={[s.btnShadow]}><Brand style={s.btn}>{content}</Brand></View>
      ) : (
        <View style={[s.btn, { backgroundColor: danger ? tint.error.bg : soft.bg }]}>{content}</View>
      )}
    </TouchableOpacity>
  );
}

export function Btns({ children }: { children: ReactNode }) {
  return (
    <View style={s.btns}>
      {React.Children.toArray(children).map((c, i) => <View key={i} style={{ flex: 1 }}>{c}</View>)}
    </View>
  );
}

/** A round soft-violet icon button, with an orange count when there is one. */
export function IconBtn({ icon, onPress, label, badge }: { icon: string; onPress: () => void; label: string; badge?: number }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={s.ib} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={17} color={soft.text} />
      {badge ? <Text style={s.badge}>{badge > 99 ? '99+' : badge}</Text> : null}
    </TouchableOpacity>
  );
}

/** A rounded progress bar, filled with the brand gradient (or a flat colour). */
export function Bar({ fraction, color, style }: { fraction: number; color?: string; style?: ViewStyle }) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <View style={[s.bar, style]}>
      {pct > 0 ? (
        color
          ? <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 5 }} />
          : <Brand style={{ width: `${pct}%` as any, height: '100%', borderRadius: 5 }} />
      ) : null}
    </View>
  );
}

/** Rounded gradient columns with a label under each; an empty column is a short tint. */
export function BarChart({ values, labels, height = 120 }: { values: number[]; labels: string[]; highlight?: number; height?: number }) {
  const max = Math.max(...values, 1);
  return (
    <View>
      <View style={[s.chart, { height }]}>
        {values.map((v, i) => (
          <View key={i} style={s.colSlot}>
            {v > 0
              ? <Brand vertical style={[s.col, { height: `${Math.max(6, (v / max) * 100)}%` as any }]} />
              : <View style={s.colEmpty} />}
          </View>
        ))}
      </View>
      <View style={s.lab}>
        {labels.map((l, i) => <Text key={i} style={s.labText} numberOfLines={1}>{l}</Text>)}
      </View>
    </View>
  );
}

/** One bar split into parts, e.g. cash against mobile money. */
export function SplitBar({ parts }: { parts: { value: number; color: string }[] }) {
  const total = parts.reduce((t, p) => t + p.value, 0);
  return (
    <View style={s.split}>
      {total > 0
        ? parts.filter((p) => p.value > 0).map((p, i) => <View key={i} style={{ flex: p.value, backgroundColor: p.color, borderRadius: 5 }} />)
        : <View style={{ flex: 1, backgroundColor: soft.barTrack }} />}
    </View>
  );
}

/** A small tinted figure box — "Cash 381K" beside "Mobile money 238K". */
export function Met({ tone, label, value }: { tone: TintTone; label: string; value: string }) {
  const t = tint[tone];
  return (
    <View style={[s.met, { backgroundColor: t.bg }]}>
      <Text style={[s.metLabel, { color: t.text }]} numberOfLines={1}>{label}</Text>
      <Text style={[s.metValue, { color: t.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

/** A label over a figure on a pale violet — "Expected UGX 270,000". */
export function KeyFig({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.keyFig}>
      <Text style={kitStyles.k}>{label}</Text>
      <Text style={s.keyFigValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

/** The gradient banner: a white icon on glass, then whatever goes beside it. */
export function Banner({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <Brand style={s.banner}>
      <View style={s.bannerIcon}><Icon name={icon} size={22} color="#fff" /></View>
      <View style={{ flex: 1 }}>{children}</View>
    </Brand>
  );
}

/** Icon-and-text facts in a line: branch, worker, time. */
export function MetaRow({ items }: { items: { icon: string; text: string }[] }) {
  return (
    <View style={s.metaRow}>
      {items.filter((i) => i.text).map((i, n) => (
        <View key={n} style={s.metaItem}>
          <Icon name={i.icon} size={11} color={tint.primary.fg} />
          <Text style={s.metaText} numberOfLines={1}>{i.text}</Text>
        </View>
      ))}
    </View>
  );
}

export function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View style={s.search}>
      <Icon name="search" size={15} color={soft.text} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[s.searchInput, noFocusRing]}
        accessibilityLabel={placeholder}
        autoCorrect={false}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChange('')} hitSlop={10} accessibilityLabel="Clear search">
          <Icon name="times-circle" size={15} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Note({ children, icon = 'info-circle' }: { children: ReactNode; icon?: string }) {
  return (
    <View style={s.note}>
      <Icon name={icon} size={15} color={soft.noteText} style={{ marginTop: 1 }} />
      <Text style={s.noteText}>{children}</Text>
    </View>
  );
}

export function Hr() {
  return <View style={s.hr} />;
}

export const kitStyles = StyleSheet.create({
  k: { fontSize: 12, lineHeight: 16, ...jk.medium, color: colors.textSecondary },
  n: { fontSize: 30, lineHeight: 36, ...jk.heavy, color: colors.text, marginTop: 2, ...tabular },
  name: { fontSize: 16, ...jk.bold, color: colors.text },
  plate: { fontSize: 18, ...jk.heavy, color: colors.text, letterSpacing: 0.3 },
  meta: { fontSize: 13, lineHeight: 18, ...jk.medium, color: colors.textSecondary, marginTop: 4, marginBottom: 12 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  divider: { height: 1, backgroundColor: soft.line, marginVertical: 12 },
});

const s = StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderRadius: 22, padding: 16, ...soft.cardShadow },
  cardFlush: { paddingVertical: 4 },
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginHorizontal: 2, marginBottom: -4 },
  sec: { fontSize: 16, ...jk.bold, color: colors.text },
  g2Row: { flexDirection: 'row', gap: 12 },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, alignSelf: 'center' },
  pillText: { fontSize: 12, ...jk.bold },

  tile: { borderRadius: 22, padding: 14 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileLabel: { flex: 1, fontSize: 14, ...jk.semibold, color: colors.text },
  tileLabelPlain: { fontSize: 12, ...jk.medium, color: colors.textSecondary },
  tileValue: { fontSize: 34, lineHeight: 40, ...jk.heavy, color: colors.text, marginTop: 10, marginBottom: 2, ...tabular },
  tileValueSmall: { fontSize: 28, lineHeight: 34, marginTop: 6 },
  tileSub: { fontSize: 12, lineHeight: 16, ...jk.medium, color: colors.textSecondary },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 44,
    borderBottomWidth: 1, borderBottomColor: soft.line,
  },
  rowLast: { borderBottomWidth: 0 },
  rowT: { fontSize: 15, lineHeight: 20, ...jk.semibold, color: colors.text },
  rowSub: { fontSize: 12, lineHeight: 17, ...jk.medium, color: colors.textSecondary, marginTop: 3 },
  amt: { fontSize: 15, ...jk.bold, color: colors.text, ...tabular },

  chipsScroll: { flexGrow: 0, marginHorizontal: -16 },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: { height: 44, paddingHorizontal: 16, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipOff: { backgroundColor: soft.bg },
  chipText: { fontSize: 14, ...jk.semibold, color: soft.text },
  chipTextOn: { color: '#fff' },

  btns: { flexDirection: 'row', gap: 10 },
  btn: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnShadow: { borderRadius: 25, ...soft.btnShadow },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { fontSize: 15, ...jk.bold },

  ib: { width: 44, height: 44, borderRadius: 22, backgroundColor: soft.bg, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, lineHeight: 18, borderRadius: 9, paddingHorizontal: 5,
    backgroundColor: soft.badge, color: '#fff', fontSize: 11, ...jk.bold, textAlign: 'center', overflow: 'hidden',
  },

  bar: { height: 10, borderRadius: 5, backgroundColor: soft.barTrack, overflow: 'hidden' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 16 },
  colSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  col: { width: '100%', borderRadius: 10 },
  colEmpty: { height: 6, borderRadius: 3, backgroundColor: soft.barTrack },
  lab: { flexDirection: 'row', gap: 6, marginTop: 8 },
  labText: { flex: 1, textAlign: 'center', fontSize: 11, ...jk.medium, color: colors.textSecondary },
  split: { flexDirection: 'row', gap: 3, height: 10, borderRadius: 5, overflow: 'hidden', marginVertical: 12 },

  met: { flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
  metLabel: { fontSize: 12, ...jk.semibold },
  metValue: { fontSize: 16, ...jk.heavy, marginTop: 4, ...tabular },
  keyFig: { flex: 1, backgroundColor: '#F6EEFB', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
  keyFigValue: { fontSize: 15, ...jk.bold, color: colors.text, marginTop: 2, ...tabular },

  banner: { borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  bannerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 4, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  metaText: { fontSize: 12, ...jk.semibold, color: colors.textSecondary },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: 24,
    backgroundColor: colors.bgCard, paddingHorizontal: 16, ...soft.cardShadow,
  },
  searchInput: { flex: 1, fontSize: 15, ...jk.medium, color: colors.text, paddingVertical: 0 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: soft.note, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18, ...jk.medium, color: soft.noteText },
  hr: { height: 1, backgroundColor: soft.line, marginVertical: 12 },
});
