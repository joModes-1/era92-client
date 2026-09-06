import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import Badge from '../../components/Badge';
import ScreenHeader from '../../components/ScreenHeader';
import GradientButton from '../../components/GradientButton';
import { useAppAlert } from '../../components/AppAlert';
import {
  Surface, SectionHeader, EmptyState, SkeletonList,
  Field, FormSheet, PillPicker, RankedBars, ListRow, initials,
} from '../../components/ui';
import type { Tone } from '../../theme';

const ugx = (n: any) => Number(n || 0).toLocaleString();

const BILLING_META: Record<string, { label: string; tone: Tone; explain: string }> = {
  trial: { label: 'Trial', tone: 'info', explain: 'Evaluating the software — not yet paying.' },
  active: { label: 'Paying', tone: 'success', explain: 'Subscription is current.' },
  past_due: { label: 'Past due', tone: 'error', explain: 'Their renewal date has passed with no payment recorded.' },
  cancelled: { label: 'Cancelled', tone: 'neutral', explain: 'No longer subscribed.' },
};

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'bank_transfer', label: 'Bank' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const monthLabel = (m: string) => {
  const [y, mm] = m.split('-');
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString(undefined, { month: 'short' });
};

const dateOnly = (d: any) => (d ? String(d).slice(0, 10) : null);

function addMonths(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 };

export default function OrgDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const alert = useAppAlert();
  const orgId = route.params?.orgId;

  const [org, setOrg] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Plan / billing-state editor
  const [planSheet, setPlanSheet] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<string>('trial');
  const [dueDate, setDueDate] = useState('');
  const [billingNotes, setBillingNotes] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  // Record-a-payment sheet
  const [paySheet, setPaySheet] = useState(false);
  const [amount, setAmount] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [savingPay, setSavingPay] = useState(false);

  const load = useCallback(async () => {
    const [o, p] = await Promise.allSettled([api.platformOrg(orgId), api.listPlans()]);
    if (o.status === 'fulfilled' && o.value) setOrg(o.value);
    if (p.status === 'fulfilled' && Array.isArray(p.value)) setPlans(p.value);
  }, [orgId]);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openPlanSheet = () => {
    setPlanId(org?.plan_id || null);
    setBillingStatus(org?.billing_status || 'trial');
    setDueDate(dateOnly(org?.next_due_at) || '');
    setBillingNotes(org?.billing_notes || '');
    setPlanSheet(true);
  };

  const submitPlan = async () => {
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      alert('Check the date', 'Use the format YYYY-MM-DD, e.g. 2026-12-31.');
      return;
    }
    setSavingPlan(true);
    try {
      await api.setOrgSubscription(orgId, {
        plan_id: planId,
        billing_status: billingStatus as any,
        next_due_at: dueDate || null,
        billing_notes: billingNotes.trim() || null,
      });
      setPlanSheet(false);
      await load();
    } catch (e: any) {
      alert('Could not save', e.message);
    }
    setSavingPlan(false);
  };

  const openPaySheet = () => {
    const plan = plans.find((p) => p.id === org?.plan_id);
    // Default the period to the cycle that follows what they have already paid
    // for, so the common case — "they paid for the next month" — is one tap.
    const start = dateOnly(org?.next_due_at) || new Date().toISOString().slice(0, 10);
    const months = CYCLE_MONTHS[plan?.billing_cycle] || 1;
    setAmount(plan?.price_ugx ? String(plan.price_ugx) : '');
    setPeriodStart(start);
    setPeriodEnd(addMonths(start, months));
    setMethod('cash');
    setReference('');
    setPaySheet(true);
  };

  const submitPay = async () => {
    const n = parseInt(amount, 10);
    if (isNaN(n) || n <= 0) {
      alert('Enter an amount', 'How much did they pay?');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
      alert('Check the dates', 'Use the format YYYY-MM-DD.');
      return;
    }
    if (periodEnd < periodStart) {
      alert('Check the dates', 'The period must end on or after it starts.');
      return;
    }
    setSavingPay(true);
    try {
      await api.recordOrgPayment(orgId, {
        amount_ugx: n,
        period_start: periodStart,
        period_end: periodEnd,
        method: method as any,
        reference: reference.trim() || undefined,
      });
      setPaySheet(false);
      await load();
      alert('Payment recorded', `UGX ${n.toLocaleString()} received. Their next renewal is ${periodEnd}.`);
    } catch (e: any) {
      alert('Could not record', e.message);
    }
    setSavingPay(false);
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Organization" back />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={5} /></ScrollView>
      </View>
    );
  }

  if (!org) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Organization" back />
        <ScrollView contentContainerStyle={styles.body}>
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="building" title="Not found" message="This organization could not be loaded." />
          </Surface>
        </ScrollView>
      </View>
    );
  }

  const bm = BILLING_META[org.billing_status] || BILLING_META.trial;
  const days = org.days_to_due == null ? null : Number(org.days_to_due);
  const overdue = days != null && days < 0;
  const dueSoon = days != null && days >= 0 && days <= 7;
  const usage = org.usage || [];
  const maxGross = Math.max(...usage.map((u: any) => Number(u.gross_ugx || 0)), 1);

  return (
    <View style={styles.container}>
      <ScreenHeader title={org.name} subtitle={`/${org.slug}`} back />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── What they pay us ─────────────────────────────────── */}
        <LinearGradient
          colors={[colors.ink[800], colors.ink[950]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <Text style={styles.heroKicker}>SUBSCRIPTION</Text>
            <Badge label={bm.label} tone={bm.tone} small />
          </View>

          <Text style={styles.heroPlan} numberOfLines={1}>
            {org.plan_name || 'No plan assigned'}
          </Text>

          <View style={styles.heroPriceRow}>
            <Text style={styles.heroPrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {org.plan_price_ugx != null ? ugx(org.plan_price_ugx) : '—'}
            </Text>
            <Text style={styles.heroPer}>
              UGX{org.billing_cycle ? ` / ${org.billing_cycle.replace('ly', '')}` : ''}
            </Text>
          </View>

          <View style={styles.heroFoot}>
            <Icon
              name={overdue ? 'exclamation-triangle' : dueSoon ? 'clock' : 'calendar-check'}
              size={11}
              color={overdue ? '#FF8A9B' : 'rgba(255,255,255,0.7)'}
            />
            <Text style={[styles.heroFootText, overdue && styles.heroFootAlert]}>
              {days == null
                ? 'No renewal date set'
                : overdue
                ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
                : days === 0
                ? 'Renews today'
                : `Renews in ${days} day${days === 1 ? '' : 's'}`}
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.heroPaid}>{ugx(org.paid_total_ugx)} paid to date</Text>
          </View>
        </LinearGradient>

        {/* What this status means, in words */}
        <View style={styles.explainRow}>
          <Icon name="info-circle" size={11} color={colors.textMuted} />
          <Text style={styles.explainText}>{bm.explain}</Text>
        </View>

        {/* ── Actions ──────────────────────────────────────────── */}
        <View style={styles.actionRow}>
          <GradientButton title="Record payment" onPress={openPaySheet} icon="hand-holding-usd" full />
          <TouchableOpacity style={styles.secondaryBtn} onPress={openPlanSheet} activeOpacity={0.75}>
            <Icon name="sliders-h" size={11} color={colors.primary} />
            <Text style={styles.secondaryText}>Change plan</Text>
          </TouchableOpacity>
        </View>

        {/* ── How much business they do on the software ────────── */}
        <View>
          <SectionHeader title="Their business, last 6 months" icon="chart-bar" />
          <Surface elevation="sm" padded="lg">
            {usage.every((u: any) => Number(u.gross_ugx || 0) === 0) ? (
              <EmptyState icon="chart-bar" title="No washes recorded" message="This tenant has not processed any washes yet." />
            ) : (
              <View style={styles.months}>
                {usage.map((u: any) => {
                  const g = Number(u.gross_ugx || 0);
                  const h = Math.max(3, (g / maxGross) * 72);
                  const isLast = u === usage[usage.length - 1];
                  return (
                    <View key={u.month} style={styles.monthCol}>
                      <Text style={styles.monthValue} numberOfLines={1}>
                        {g >= 1_000_000 ? `${(g / 1_000_000).toFixed(1)}M` : g >= 1000 ? `${Math.round(g / 1000)}K` : g}
                      </Text>
                      <View
                        style={[
                          styles.monthBar,
                          { height: h, backgroundColor: isLast ? colors.primary : colors.primaryTint },
                        ]}
                      />
                      <Text style={[styles.monthLabel, isLast && styles.monthLabelOn]}>{monthLabel(u.month)}</Text>
                      <Text style={styles.monthWashes}>{u.washes}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            <View style={styles.monthLegend}>
              <Text style={styles.monthLegendText}>UGX taken · washes below</Text>
            </View>
          </Surface>
        </View>

        {/* ── Tenant size ──────────────────────────────────────── */}
        <View>
          <SectionHeader title="Size" icon="building" />
          <Surface elevation="sm" padded="lg" style={{ gap: spacing.md }}>
            <View style={styles.sizeGrid}>
              <SizeStat label="Branches" value={org.branch_count} limit={org.max_branches} />
              <SizeStat label="Staff" value={org.staff_count} />
              <SizeStat label="Customers" value={org.client_count} />
            </View>
            {org.max_branches != null && Number(org.branch_count) >= Number(org.max_branches) && (
              <View style={styles.limitWarn}>
                <Icon name="exclamation-triangle" size={11} color={colors.warning} />
                <Text style={styles.limitWarnText}>
                  At the plan's branch limit — an upgrade is the natural next conversation.
                </Text>
              </View>
            )}
          </Surface>
        </View>

        {/* ── Branches ─────────────────────────────────────────── */}
        {org.branches?.length > 0 && (
          <View>
            <SectionHeader title="Branches" count={org.branches.length} icon="map-marker-alt" />
            <Surface elevation="sm" padded="sm">
              {org.branches.map((b: any, i: number) => (
                <ListRow
                  key={b.id}
                  leading={b.code}
                  title={b.name}
                  subtitle={`${b.staff_count} staff`}
                  trailing={<Badge label={b.status === 'active' ? 'Active' : b.status} tone={b.status === 'active' ? 'success' : 'neutral'} small />}
                  last={i === org.branches.length - 1}
                />
              ))}
            </Surface>
          </View>
        )}

        {/* ── Who runs it ──────────────────────────────────────── */}
        {org.admins?.length > 0 && (
          <View>
            <SectionHeader title="Org admins" count={org.admins.length} icon="user-shield" />
            <Surface elevation="sm" padded="sm">
              {org.admins.map((a: any, i: number) => (
                <ListRow
                  key={a.id}
                  leading={initials(a.full_name)}
                  title={a.full_name}
                  subtitle={a.username}
                  meta={a.last_login_at ? `Last in ${String(a.last_login_at).slice(0, 10)}` : 'Never signed in'}
                  last={i === org.admins.length - 1}
                  trailing={
                    a.must_change_password
                      ? <Badge label="Temp password" tone="warning" small />
                      : <Badge label={a.status === 'active' ? 'Active' : a.status} tone={a.status === 'active' ? 'success' : 'neutral'} small />
                  }
                />
              ))}
            </Surface>
          </View>
        )}

        {/* ── Payment history ──────────────────────────────────── */}
        <View>
          <SectionHeader title="Payments" count={org.payments?.length || 0} icon="receipt" />
          {!org.payments || org.payments.length === 0 ? (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="receipt" title="No payments yet" message="Record their first payment when it arrives." />
            </Surface>
          ) : (
            <Surface elevation="sm" padded="sm">
              {org.payments.map((p: any, i: number) => (
                <ListRow
                  key={p.id}
                  leading="check"
                  leadingTone="success"
                  title={`UGX ${ugx(p.amount_ugx)}`}
                  subtitle={`${p.period_start} → ${p.period_end}`}
                  meta={[
                    METHODS.find((m) => m.value === p.method)?.label || p.method,
                    p.reference,
                    p.recorded_by_name,
                  ].filter(Boolean).join(' · ')}
                  last={i === org.payments.length - 1}
                />
              ))}
            </Surface>
          )}
        </View>

        {org.billing_notes ? (
          <Surface elevation="sm" padded="lg" style={{ gap: 5 }}>
            <Text style={styles.noteLabel}>BILLING NOTES</Text>
            <Text style={styles.noteText}>{org.billing_notes}</Text>
          </Surface>
        ) : null}
      </ScrollView>

      {/* ── Change plan / billing state ────────────────────────── */}
      <FormSheet
        visible={planSheet}
        onClose={() => setPlanSheet(false)}
        title="Subscription"
        subtitle={org.name}
        submitLabel="Save"
        onSubmit={submitPlan}
        submitting={savingPlan}
      >
        <PillPicker
          label="Plan"
          value={planId}
          onChange={(v: any) => setPlanId(v)}
          options={plans.map((p) => ({
            value: p.id,
            label: `${p.name} · ${p.price_ugx > 0 ? ugx(p.price_ugx) : 'Free'}`,
          }))}
        />

        <PillPicker
          label="Billing status"
          value={billingStatus}
          onChange={(v: any) => setBillingStatus(v)}
          options={Object.entries(BILLING_META).map(([k, v]) => ({ value: k, label: v.label }))}
        />

        <Field
          label="Next renewal date"
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="2026-12-31"
          autoCapitalize="none"
          hint="YYYY-MM-DD. Leave blank if they are not on a renewal cycle."
        />

        <Field
          label="Notes"
          value={billingNotes}
          onChangeText={setBillingNotes}
          placeholder="e.g. Agreed 10% discount for year one"
          multiline
          style={{ marginBottom: 0 }}
        />
      </FormSheet>

      {/* ── Record a payment ──────────────────────────────────── */}
      <FormSheet
        visible={paySheet}
        onClose={() => setPaySheet(false)}
        title="Record payment"
        subtitle={org.name}
        submitLabel="Record payment"
        onSubmit={submitPay}
        submitting={savingPay}
      >
        <Field
          label="Amount received"
          required
          prefix="UGX"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
          hint={org.plan_price_ugx ? `Plan price is ${ugx(org.plan_price_ugx)}.` : undefined}
        />

        <Field
          label="Covers from"
          required
          value={periodStart}
          onChangeText={setPeriodStart}
          placeholder="2026-09-01"
          autoCapitalize="none"
        />
        <Field
          label="Covers until"
          required
          value={periodEnd}
          onChangeText={setPeriodEnd}
          placeholder="2026-10-01"
          autoCapitalize="none"
          hint="Their renewal date moves to this day."
        />

        <PillPicker
          label="How they paid"
          value={method}
          onChange={(v: any) => setMethod(v)}
          options={METHODS}
        />

        <Field
          label="Reference"
          value={reference}
          onChangeText={setReference}
          placeholder="e.g. MoMo txn ID"
          autoCapitalize="none"
          style={{ marginBottom: 0 }}
        />
      </FormSheet>
    </View>
  );
}

function SizeStat({ label, value, limit }: { label: string; value: any; limit?: any }) {
  const atLimit = limit != null && Number(value) >= Number(limit);
  return (
    <View style={styles.sizeStat}>
      <Text style={[styles.sizeValue, atLimit && { color: colors.warning }]}>
        {Number(value || 0)}
        {limit != null && <Text style={styles.sizeLimit}>/{limit}</Text>}
      </Text>
      <Text style={styles.sizeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  hero: { borderRadius: radii.lg, padding: spacing.lg, gap: 3 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroKicker: {
    fontSize: font.micro, fontWeight: weight.heavy,
    color: 'rgba(255,255,255,0.55)', letterSpacing: tracking.capsWide,
  },
  heroPlan: { fontSize: font.regular, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  heroPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroPrice: { flexShrink: 1, fontSize: font.display, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.display },
  heroPer: { fontSize: font.xs, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.55)' },
  heroFoot: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.16)',
  },
  heroFootText: { fontSize: font.xs, color: 'rgba(255,255,255,0.75)', fontWeight: weight.semibold },
  heroFootAlert: { color: '#FF8A9B', fontWeight: weight.heavy },
  heroPaid: { fontSize: font.micro, color: 'rgba(255,255,255,0.5)' },

  explainRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: -spacing.sm, paddingHorizontal: spacing.xs },
  explainText: { flex: 1, fontSize: font.xs, color: colors.textMuted, lineHeight: 16 },

  actionRow: { gap: spacing.sm },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    minHeight: 44, borderRadius: radii.md, backgroundColor: colors.primarySoft,
  },
  secondaryText: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.primary },

  months: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, minHeight: 118 },
  monthCol: { flex: 1, alignItems: 'center', gap: 3 },
  monthValue: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textSecondary },
  monthBar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  monthLabel: { fontSize: font.micro, color: colors.textMuted, fontWeight: weight.semibold },
  monthLabelOn: { color: colors.primary, fontWeight: weight.heavy },
  monthWashes: { fontSize: font.micro, color: colors.ink[400] },
  monthLegend: { marginTop: spacing.sm, alignItems: 'center' },
  monthLegendText: { fontSize: font.micro, color: colors.textMuted },

  sizeGrid: { flexDirection: 'row', gap: spacing.md },
  sizeStat: { flex: 1, gap: 1 },
  sizeValue: { fontSize: font.xl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  sizeLimit: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textMuted },
  sizeLabel: { fontSize: font.micro, color: colors.textMuted, fontWeight: weight.semibold },
  limitWarn: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  limitWarnText: { flex: 1, fontSize: font.xs, color: colors.warning, fontWeight: weight.semibold, lineHeight: 16 },

  noteLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  noteText: { fontSize: font.sm, color: colors.text, lineHeight: 19 },
});
