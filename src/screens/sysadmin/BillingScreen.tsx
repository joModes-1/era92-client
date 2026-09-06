import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import Badge from '../../components/Badge';
import ScreenHeader, { HeaderStat } from '../../components/ScreenHeader';
import { useAppAlert } from '../../components/AppAlert';
import {
  Surface, SectionHeader, EmptyState, SkeletonList, ListRow,
  Field, FormSheet, PillPicker,
} from '../../components/ui';

const ugx = (n: any) => Number(n || 0).toLocaleString();

const compact = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `${Math.round(n / 1000)}K`;
  return `${Math.round(n)}`;
};

const monthLabel = (m: string) => {
  const [y, mm] = m.split('-');
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString(undefined, { month: 'short' });
};

const CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function BillingScreen() {
  const navigation = useNavigation<any>();
  const alert = useAppAlert();

  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Plan editor — one sheet for both create and edit; `editing` decides which.
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [maxBranches, setMaxBranches] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [b, p] = await Promise.allSettled([api.billingSummary(), api.listPlans()]);
    if (b.status === 'fulfilled' && b.value) setData(b.value);
    if (p.status === 'fulfilled' && Array.isArray(p.value)) setPlans(p.value);
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openNew = () => {
    setEditing(null);
    setCode(''); setName(''); setPrice(''); setCycle('monthly');
    setMaxBranches(''); setDescription('');
    setSheet(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setCode(p.code);
    setName(p.name);
    setPrice(String(p.price_ugx));
    setCycle(p.billing_cycle);
    setMaxBranches(p.max_branches == null ? '' : String(p.max_branches));
    setDescription(p.description || '');
    setSheet(true);
  };

  const submit = async () => {
    const n = parseInt(price, 10);
    if (!name.trim()) { alert('Missing name', 'Give the plan a name.'); return; }
    if (isNaN(n) || n < 0) { alert('Check the price', 'Enter a price in UGX (0 for a free plan).'); return; }
    if (!editing && !/^[a-z0-9_-]+$/.test(code.trim())) {
      alert('Check the code', 'Lowercase letters, numbers, hyphen or underscore only.');
      return;
    }
    const mb = maxBranches.trim() === '' ? null : parseInt(maxBranches, 10);
    if (mb !== null && (isNaN(mb) || mb < 1)) {
      alert('Check the branch limit', 'Leave blank for unlimited, or enter 1 or more.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.updatePlan(editing.id, {
          name: name.trim(),
          price_ugx: n,
          billing_cycle: cycle as any,
          max_branches: mb,
          description: description.trim() || undefined,
        });
      } else {
        await api.createPlan({
          code: code.trim(),
          name: name.trim(),
          price_ugx: n,
          billing_cycle: cycle as any,
          max_branches: mb,
          description: description.trim() || undefined,
        });
      }
      setSheet(false);
      await load();
    } catch (e: any) {
      alert('Could not save', e.message);
    }
    setSaving(false);
  };

  const toggleActive = async (p: any) => {
    try {
      await api.updatePlan(p.id, { active: !p.active });
      await load();
    } catch (e: any) {
      alert('Error', e.message);
    }
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Billing" subtitle="What the platform earns" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={5} /></ScrollView>
      </View>
    );
  }

  const s = data?.summary || {};
  const onboarding = data?.onboarding || [];
  const attention = data?.needs_attention || [];

  const mrr = Number(s.mrr_ugx || 0);
  const collectedMonth = Number(s.collected_this_month || 0);
  const maxOnboard = Math.max(...onboarding.map((o: any) => Number(o.onboarded || 0)), 1);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Billing" subtitle="What the platform earns">
        <HeaderStat label="Paying" value={Number(s.paying_orgs || 0)} icon="check-circle" />
        <HeaderStat label="Trial" value={Number(s.trial_orgs || 0)} icon="hourglass-half" />
        <HeaderStat label="Overdue" value={Number(s.past_due_orgs || 0)} icon="exclamation-triangle" />
      </ScreenHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── MRR: the platform's own headline number ─────────── */}
        <LinearGradient
          colors={[colors.ink[800], colors.ink[950]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.bloom} pointerEvents="none" />
          <Text style={styles.heroKicker}>MONTHLY RECURRING REVENUE</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroCurrency}>UGX</Text>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {ugx(mrr)}
            </Text>
          </View>
          <Text style={styles.heroSub}>
            from {Number(s.paying_orgs || 0)} paying organisation{Number(s.paying_orgs) === 1 ? '' : 's'}
          </Text>

          <View style={styles.heroFoot}>
            <View style={styles.heroFootItem}>
              <Text style={styles.heroFootValue}>{compact(collectedMonth)}</Text>
              <Text style={styles.heroFootLabel}>Collected this month</Text>
            </View>
            <View style={styles.heroFootDivide} />
            <View style={styles.heroFootItem}>
              <Text style={styles.heroFootValue}>{compact(Number(s.collected_all_time || 0))}</Text>
              <Text style={styles.heroFootLabel}>All time</Text>
            </View>
            <View style={styles.heroFootDivide} />
            <View style={styles.heroFootItem}>
              <Text style={styles.heroFootValue}>{Number(s.onboarded_this_month || 0)}</Text>
              <Text style={styles.heroFootLabel}>Onboarded</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Who needs chasing ───────────────────────────────── */}
        <View>
          <SectionHeader title="Needs chasing" count={attention.length} icon="bell" />
          {attention.length === 0 ? (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="check-circle" title="Nobody is overdue" message="Every subscription is current or not yet due." />
            </Surface>
          ) : (
            <Surface elevation="sm" padded="sm">
              {attention.map((o: any, i: number) => {
                const d = o.days_to_due == null ? null : Number(o.days_to_due);
                const over = d != null && d < 0;
                return (
                  <ListRow
                    key={o.id}
                    onPress={() => navigation.navigate('Org Detail', { orgId: o.id })}
                    leading={over ? 'exclamation' : 'clock'}
                    leadingTone={over ? 'error' : 'warning'}
                    title={o.name}
                    subtitle={o.plan_name || 'No plan'}
                    meta={
                      d == null
                        ? 'No renewal date'
                        : over
                        ? `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} overdue`
                        : d === 0
                        ? 'Due today'
                        : `Due in ${d} day${d === 1 ? '' : 's'}`
                    }
                    value={o.plan_price_ugx ? ugx(o.plan_price_ugx) : '—'}
                    valueTone={over ? 'error' : undefined}
                    last={i === attention.length - 1}
                  />
                );
              })}
            </Surface>
          )}
        </View>

        {/* ── Onboarding curve ────────────────────────────────── */}
        <View>
          <SectionHeader title="New organisations" icon="chart-bar" />
          <Surface elevation="sm" padded="lg">
            {onboarding.every((o: any) => Number(o.onboarded || 0) === 0) ? (
              <EmptyState icon="chart-bar" title="No sign-ups in six months" message="New tenants will chart here as you onboard them." />
            ) : (
              <View style={styles.months}>
                {onboarding.map((o: any, i: number) => {
                  const c = Number(o.onboarded || 0);
                  const h = Math.max(3, (c / maxOnboard) * 68);
                  const isLast = i === onboarding.length - 1;
                  return (
                    <View key={o.month} style={styles.monthCol}>
                      <Text style={styles.monthValue}>{c}</Text>
                      <View
                        style={[
                          styles.monthBar,
                          { height: h, backgroundColor: isLast ? colors.primary : colors.primaryTint },
                        ]}
                      />
                      <Text style={[styles.monthLabel, isLast && styles.monthLabelOn]}>{monthLabel(o.month)}</Text>
                      <Text style={styles.monthMoney}>{compact(Number(o.collected_ugx || 0))}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            <View style={styles.legend}>
              <Text style={styles.legendText}>orgs onboarded · UGX collected below</Text>
            </View>
          </Surface>
        </View>

        {/* ── Tenancy mix, stated rather than charted ─────────── */}
        <Surface elevation="sm" padded="lg" style={{ gap: spacing.md }}>
          <Text style={styles.mixTitle}>TENANCY</Text>
          <View style={styles.mixGrid}>
            <MixStat label="Paying" value={s.paying_orgs} tone={colors.success} />
            <MixStat label="On trial" value={s.trial_orgs} tone={colors.info} />
            <MixStat label="Overdue" value={s.past_due_orgs} tone={colors.error} />
            <MixStat label="Cancelled" value={s.cancelled_orgs} tone={colors.textMuted} />
          </View>
        </Surface>

        {/* ── The price list ──────────────────────────────────── */}
        <View>
          <SectionHeader
            title="Plans"
            count={plans.length}
            icon="tags"
            action="New plan"
            onAction={openNew}
          />
          {plans.length === 0 ? (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="tags" title="No plans yet" message="Create the plans you sell against." />
            </Surface>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {plans.map((p: any) => (
                <Surface key={p.id} elevation="sm" style={[styles.planCard, !p.active && styles.planOff]}>
                  <View style={styles.planHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.planCode} numberOfLines={1}>
                        {p.code} · {p.max_branches == null ? 'unlimited branches' : `up to ${p.max_branches} branch${p.max_branches === 1 ? '' : 'es'}`}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.planPrice}>
                        {Number(p.price_ugx) > 0 ? ugx(p.price_ugx) : 'Free'}
                      </Text>
                      <Text style={styles.planCycle}>{p.billing_cycle}</Text>
                    </View>
                  </View>

                  {p.description ? (
                    <Text style={styles.planDesc} numberOfLines={2}>{p.description}</Text>
                  ) : null}

                  <View style={styles.planFoot}>
                    <Badge
                      label={`${p.org_count} org${Number(p.org_count) === 1 ? '' : 's'}`}
                      tone={Number(p.org_count) > 0 ? 'primary' : 'neutral'}
                      small
                    />
                    {Number(p.paying_org_count) > 0 && (
                      <Badge label={`${p.paying_org_count} paying`} tone="success" small />
                    )}
                    {!p.active && <Badge label="Retired" tone="neutral" small />}
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={() => openEdit(p)} hitSlop={8} activeOpacity={0.6}>
                      <Text style={styles.planAction}>Edit</Text>
                    </TouchableOpacity>
                    <Text style={styles.planDot}>·</Text>
                    <TouchableOpacity onPress={() => toggleActive(p)} hitSlop={8} activeOpacity={0.6}>
                      <Text style={[styles.planAction, { color: p.active ? colors.textMuted : colors.success }]}>
                        {p.active ? 'Retire' : 'Restore'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Surface>
              ))}
            </View>
          )}
        </View>

        <View style={styles.hint}>
          <Icon name="info-circle" size={11} color={colors.textMuted} />
          <Text style={styles.hintText}>
            Retiring a plan hides it from new assignments. Organisations already on it keep their price
            and are not moved — change those individually.
          </Text>
        </View>
      </ScrollView>

      <FormSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title={editing ? 'Edit plan' : 'New plan'}
        subtitle={editing ? editing.code : 'A price you sell the software at'}
        submitLabel={editing ? 'Save plan' : 'Create plan'}
        onSubmit={submit}
        submitting={saving}
      >
        {!editing && (
          <Field
            label="Code"
            required
            value={code}
            onChangeText={(t: string) => setCode(t.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="growth"
            autoCapitalize="none"
            hint="Short internal identifier. Cannot be changed later."
          />
        )}
        <Field label="Name" required value={name} onChangeText={setName} placeholder="Growth" />
        <Field
          label="Price"
          required
          prefix="UGX"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="350000"
          hint="Use 0 for a free or trial plan."
        />
        <PillPicker label="Billed" value={cycle} onChange={(v: any) => setCycle(v)} options={CYCLES} />
        <Field
          label="Branch limit"
          value={maxBranches}
          onChangeText={setMaxBranches}
          keyboardType="numeric"
          placeholder="5"
          hint="Leave blank for unlimited."
        />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Up to 5 branches, full reporting."
          multiline
          style={{ marginBottom: 0 }}
        />
      </FormSheet>
    </View>
  );
}

function MixStat({ label, value, tone }: { label: string; value: any; tone: string }) {
  return (
    <View style={styles.mixStat}>
      <Text style={[styles.mixValue, { color: tone }]}>{Number(value || 0)}</Text>
      <Text style={styles.mixLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  hero: { borderRadius: radii.lg, padding: spacing.lg, overflow: 'hidden' },
  bloom: {
    position: 'absolute', top: -70, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(233,30,99,0.18)',
  },
  heroKicker: {
    fontSize: font.micro, fontWeight: weight.heavy,
    color: 'rgba(255,255,255,0.55)', letterSpacing: tracking.capsWide,
  },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 3 },
  heroCurrency: { fontSize: font.sm, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.55)' },
  heroValue: { flexShrink: 1, fontSize: font.display, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.display },
  heroSub: { fontSize: font.xs, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  heroFoot: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.16)',
  },
  heroFootItem: { flex: 1, gap: 1 },
  heroFootValue: { fontSize: font.regular, fontWeight: weight.black, color: '#fff' },
  heroFootLabel: { fontSize: font.micro, color: 'rgba(255,255,255,0.6)' },
  heroFootDivide: { width: StyleSheet.hairlineWidth, height: 24, backgroundColor: 'rgba(255,255,255,0.18)' },

  months: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, minHeight: 112 },
  monthCol: { flex: 1, alignItems: 'center', gap: 3 },
  monthValue: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textSecondary },
  monthBar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  monthLabel: { fontSize: font.micro, color: colors.textMuted, fontWeight: weight.semibold },
  monthLabelOn: { color: colors.primary, fontWeight: weight.heavy },
  monthMoney: { fontSize: font.micro, color: colors.ink[400] },
  legend: { marginTop: spacing.sm, alignItems: 'center' },
  legendText: { fontSize: font.micro, color: colors.textMuted },

  mixTitle: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  mixGrid: { flexDirection: 'row', gap: spacing.sm },
  mixStat: { flex: 1, gap: 1 },
  mixValue: { fontSize: font.xl, fontWeight: weight.black, letterSpacing: tracking.tight },
  mixLabel: { fontSize: font.micro, color: colors.textMuted, fontWeight: weight.semibold },

  planCard: { gap: spacing.sm },
  planOff: { opacity: 0.6 },
  planHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  planName: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  planCode: { fontSize: font.micro, color: colors.textMuted, marginTop: 1 },
  planPrice: { fontSize: font.regular, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  planCycle: { fontSize: font.micro, color: colors.textMuted },
  planDesc: { fontSize: font.xs, color: colors.textSecondary, lineHeight: 17 },
  planFoot: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight,
  },
  planAction: { fontSize: font.xs, fontWeight: weight.heavy, color: colors.primary },
  planDot: { fontSize: font.xs, color: colors.ink[300] },

  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: spacing.xs },
  hintText: { flex: 1, fontSize: font.xs, color: colors.textMuted, lineHeight: 17 },
});
