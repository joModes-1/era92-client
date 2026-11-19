import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { colors, soft, tint, jk, staffType } from '../../theme';
import { HomeTopBar } from '../client/HomeParts';
import { Card, Pill } from '../../components/admin/kit';
import CssGradient from '../../components/CssGradient';
import Icon from '../../components/admin/LineIcon';
import { SkeletonList } from '../../components/ui';
import { Initials, MiniTiles, SectionHead, ugx, compact } from './platformParts';

/**
 * The platform admin's Overview (design: "Platform admin: overview, billing,
 * menu", board 1): what the platform earns, what is happening across every
 * organisation today, the last 14 days as bars you tap, and the trials about
 * to end.
 */
export default function PlatformOverviewScreen() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<any>(null);
  const [billing, setBilling] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [s, b, o] = await Promise.allSettled([api.platformStats(), api.billingSummary(), api.platformOrgs()]);
    if (s.status === 'fulfilled' && s.value) setStats(s.value);
    if (b.status === 'fulfilled' && b.value) setBilling(b.value);
    if (o.status === 'fulfilled' && Array.isArray(o.value)) setOrgs(o.value);
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const sum = billing?.summary || {};
  const mrr = Number(sum.mrr_ugx || 0);
  const paying = Number(sum.paying_orgs || 0);
  const trial = Number(sum.trial_orgs || 0);
  const overdue = Number(sum.past_due_orgs || 0);

  const washesToday = Number(stats?.washes_today || 0);
  const takenToday = Number(stats?.gross_today || 0);
  const openNow = Number(stats?.open_jobs || 0);
  const cashOut = Number(stats?.cash_with_workers || 0);

  // The last 14 days; the tapped bar (or today) is the one described above them.
  const trend: any[] = stats?.trend || [];
  const values = trend.map((d) => Number(d.gross_ugx || 0));
  const max = Math.max(1, ...values);
  // Unless a bar was tapped, describe the latest day that had any washes —
  // early in the morning "today" is still empty and would say nothing.
  const lastBusy = values.reduce((at, v, i) => (v > 0 ? i : at), -1);
  const sel = picked ?? (lastBusy >= 0 ? lastBusy : Math.max(0, trend.length - 1));
  const selDay = trend[sel];
  const dayLabel = (iso: string) =>
    new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  // Trials, soonest to end first.
  const trials = orgs
    .filter((o) => o.billing_status === 'trial' && o.trial_ends_at)
    .map((o) => ({ ...o, left: Math.ceil((new Date(String(o.trial_ends_at).slice(0, 10) + 'T23:59:59').getTime() - Date.now()) / 86400000) }))
    .sort((a, b) => a.left - b.left);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <HomeTopBar branch="Platform · all organisations" onMenu={() => navigation.openDrawer?.()} />
      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {!loaded ? <SkeletonList rows={4} /> : (
          <>
            {/* ── What the platform earns ── */}
            <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Billing')} accessibilityRole="button">
              <Card>
                <Text style={s.cardLabel}>Monthly recurring revenue</Text>
                <View style={s.mrrRow}>
                  <Text style={s.mrrUnit}>UGX</Text>
                  <Text style={s.mrr} numberOfLines={1} adjustsFontSizeToFit>{ugx(mrr)}</Text>
                </View>
                <View style={{ alignSelf: 'flex-start' }}>
                  <Pill
                    tone={paying > 0 ? 'ok' : 'neutral'}
                    label={paying > 0 ? `From ${paying} paying organisation${paying === 1 ? '' : 's'}` : 'No paying organisations yet'}
                  />
                </View>
                <MiniTiles items={[
                  { value: String(paying), label: 'Paying', tone: 'success' },
                  { value: String(trial), label: 'On trial', tone: 'info' },
                  { value: String(overdue), label: 'Overdue', tone: 'warning' },
                ]} />
              </Card>
            </TouchableOpacity>

            {/* ── Today, everywhere ── */}
            <SectionHead title="Today, everywhere" />
            <Card>
              <View style={s.three}>
                <Fig value={String(washesToday)} label="Washes today" />
                <Fig value={compact(takenToday)} label="Taken (UGX)" />
                <Fig value={String(openNow)} label="Cars open now" color={tint.info.text} />
              </View>
              {cashOut > 0 ? (
                <View style={s.note}>
                  <Icon name="money-bill-wave" size={16} color={tint.warning.text} />
                  <Text style={s.noteText}>UGX {ugx(cashOut)} is with workers across all branches, not yet handed in.</Text>
                </View>
              ) : null}
            </Card>

            {/* ── Last 14 days ── */}
            <SectionHead title="Last 14 days" />
            <Card>
              <Text style={s.hint}>Tap a bar for that day</Text>
              <Text style={s.picked}>
                {selDay ? `${dayLabel(selDay.day)} · UGX ${compact(Number(selDay.gross_ugx || 0))} · ${Number(selDay.washes || 0)} washes` : 'No days yet'}
              </Text>
              <View style={s.chart}>
                {values.map((v, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.colSlot}
                    activeOpacity={0.7}
                    onPress={() => setPicked(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`${dayLabel(trend[i].day)}: UGX ${ugx(v)}`}
                  >
                    {i === sel ? (
                      <CssGradient colors={colors.gradientButton2} locations={[0, 1]} angle={180} style={[s.col, { height: `${Math.max(3, (v / max) * 100)}%` as any }]} />
                    ) : (
                      <View style={[s.col, s.colOff, { height: `${Math.max(3, (v / max) * 100)}%` as any }]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.labels}>
                {trend.map((d, i) => (
                  <Text key={i} style={[s.labelText, i === sel && s.labelOn]}>{new Date(String(d.day).slice(0, 10) + 'T00:00:00').getDate()}</Text>
                ))}
              </View>
            </Card>

            {/* ── Trials ending soon ── */}
            {trials.length > 0 ? (
              <>
                <SectionHead title="Trials ending soon" count={trials.length} countColor={tint.info.fg} />
                <Card flush>
                  {trials.map((o, i) => (
                    <TouchableOpacity
                      key={o.id}
                      style={[s.lrow, i > 0 && s.lrowLine]}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('Org Detail', { orgId: o.id })}
                      accessibilityRole="button"
                    >
                      <Initials name={o.name} index={i} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.lTitle} numberOfLines={1}>{o.name}</Text>
                        <Text style={s.lSub} numberOfLines={1}>{Number(o.branch_count || 0)} branch{Number(o.branch_count) === 1 ? '' : 'es'} · trial</Text>
                      </View>
                      <Pill
                        tone={o.left <= 0 ? 'bad' : o.left <= 7 ? 'warn' : 'blue'}
                        label={o.left <= 0 ? 'Ended' : `${o.left} day${o.left === 1 ? '' : 's'} left`}
                      />
                    </TouchableOpacity>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** One of the three "Today" figures. */
function Fig({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[s.figValue, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={s.figLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: soft.page },
  body: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 28, gap: 14 },

  cardLabel: { fontSize: 12, ...jk.semibold, color: colors.textSecondary },
  mrrRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6, marginBottom: 6 },
  mrrUnit: { fontSize: 16, ...jk.bold, color: colors.textSecondary },
  mrr: { flexShrink: 1, fontSize: 40, lineHeight: 46, ...jk.heavy, color: colors.text, ...staffType.tabular },

  three: { flexDirection: 'row', gap: 6 },
  figValue: { fontSize: 26, lineHeight: 32, ...jk.heavy, color: colors.text, ...staffType.tabular },
  figLabel: { fontSize: 12, ...jk.medium, color: colors.textSecondary },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: tint.warning.bg, borderRadius: 14, padding: 12, marginTop: 16 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18, ...jk.semibold, color: tint.warning.text },

  hint: { fontSize: 12, ...jk.medium, color: colors.textSecondary, marginBottom: 10 },
  picked: { fontSize: 13, ...jk.heavy, color: colors.text, marginBottom: 8 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 140 },
  colSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  col: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  colOff: { backgroundColor: '#D9DFEC' },
  labels: { flexDirection: 'row', gap: 5, marginTop: 8 },
  labelText: { flex: 1, textAlign: 'center', fontSize: 11, ...jk.medium, color: colors.textSecondary },
  labelOn: { ...jk.bold, color: colors.text },

  lrow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 4 },
  lrowLine: { borderTopWidth: 1, borderTopColor: soft.line },
  lTitle: { fontSize: 15, ...jk.bold, color: colors.text },
  lSub: { fontSize: 12, ...jk.medium, color: colors.textSecondary, marginTop: 2 },
});
