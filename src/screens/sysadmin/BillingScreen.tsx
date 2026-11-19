import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { colors, soft, tint, jk, staffType } from '../../theme';
import { useAppAlert } from '../../components/AppAlert';
import { Field, FormSheet, PillPicker } from '../../components/ui';
import AdminScreen from '../../components/admin/AdminScreen';
import { Card, Pill, Row, Btn, Btns, kitStyles } from '../../components/admin/kit';
import Icon from '../../components/admin/LineIcon';
import { Initials, MiniTiles, SectionHead, ugx, compact } from './platformParts';

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
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

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
    const [b, p, o] = await Promise.allSettled([api.billingSummary(), api.listPlans(), api.platformOrgs()]);
    if (b.status === 'fulfilled' && b.value) setData(b.value);
    if (p.status === 'fulfilled' && Array.isArray(p.value)) setPlans(p.value);
    if (o.status === 'fulfilled' && Array.isArray(o.value)) setOrgs(o.value);
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

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

  const s = data?.summary || {};
  const attention = data?.needs_attention || [];
  const mrr = Number(s.mrr_ugx || 0);
  const paying = Number(s.paying_orgs || 0);
  const trial = Number(s.trial_orgs || 0);
  const overdue = Number(s.past_due_orgs || 0);
  const cancelled = Number(s.cancelled_orgs || 0);
  const tenancy = paying + trial + overdue + cancelled;
  const phoneOf = (id: string) => orgs.find((o) => o.id === id)?.phone || null;

  // Newest organisations first.
  const newest = [...orgs]
    .sort((x, y) => String(y.onboarded_at || y.created_at).localeCompare(String(x.onboarded_at || x.created_at)))
    .slice(0, 5);
  const joined = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const daysTo = (iso?: string) => (iso ? Math.ceil((new Date(String(iso).slice(0, 10) + 'T23:59:59').getTime() - Date.now()) / 86400000) : null);
  const standing = (o: any) => {
    if (o.billing_status === 'trial') {
      const d = daysTo(o.trial_ends_at);
      return d == null ? 'trial' : d <= 0 ? 'trial ended' : `trial ends in ${d} day${d === 1 ? '' : 's'}`;
    }
    if (o.billing_status === 'past_due') return 'overdue';
    if (o.billing_status === 'cancelled') return 'cancelled';
    return o.plan_name ? `paying · ${o.plan_name}` : 'paying';
  };

  return (
    <AdminScreen title="Billing" subtitle="What the platform earns" large back loading={!loaded} onRefresh={load}>
      {/* ── What the platform earns ── */}
      <Card>
        <Text style={styles.cardLabel}>Monthly recurring revenue</Text>
        <View style={styles.mrrRow}>
          <Text style={styles.mrrUnit}>UGX</Text>
          <Text style={styles.mrr} numberOfLines={1} adjustsFontSizeToFit>{ugx(mrr)}</Text>
        </View>
        {paying > 0 ? (
          <View style={{ alignSelf: 'flex-start' }}><Pill tone="ok" label={`From ${paying} paying organisation${paying === 1 ? '' : 's'}`} /></View>
        ) : (
          <Text style={kitStyles.k}>from 0 paying organisations</Text>
        )}
        <MiniTiles items={[
          { value: compact(Number(s.collected_this_month || 0)), label: 'Collected this month', tone: 'success' },
          { value: compact(Number(s.collected_all_time || 0)), label: 'All time', tone: 'primary' },
          { value: String(Number(s.total_orgs || 0)), label: 'Onboarded', tone: 'info' },
        ]} />
      </Card>

      {/* ── Who needs chasing ── */}
      <SectionHead title="Needs chasing" count={attention.length} countColor={attention.length ? '#D92D20' : '#0FA968'} />
      {attention.length === 0 ? (
        <Card>
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Icon name="check" size={26} color={tint.success.fg} /></View>
            <Text style={styles.emptyTitle}>Nobody is overdue</Text>
            <Text style={styles.emptySub}>Every subscription is current or not yet due.</Text>
          </View>
        </Card>
      ) : attention.map((o: any, i: number) => {
        const d = o.days_to_due == null ? null : Number(o.days_to_due);
        const late = d != null && d < 0 ? Math.abs(d) : 0;
        const phone = phoneOf(o.id);
        return (
          <Card key={o.id}>
            <View style={styles.chaseHead}>
              <Initials name={o.name} index={i} tone={late > 3 ? 'error' : 'warning'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.chaseName} numberOfLines={1}>{o.name}</Text>
                <Text style={kitStyles.k} numberOfLines={1}>
                  {o.plan_name || 'No plan'}{o.plan_price_ugx ? ` · UGX ${ugx(o.plan_price_ugx)} per month` : ''}
                </Text>
              </View>
              <Pill
                tone={late > 3 ? 'bad' : late > 0 ? 'warn' : 'blue'}
                label={late > 0 ? `${late} day${late === 1 ? '' : 's'} late` : d === 0 ? 'Due today' : d == null ? 'No due date' : `Due in ${d} day${d === 1 ? '' : 's'}`}
              />
            </View>
            <View style={{ marginTop: 14 }}>
              <Btns>
                {phone ? <Btn small icon="phone" title="Call" onPress={() => Linking.openURL(`tel:${phone}`).catch(() => {})} /> : null}
                <Btn small primary title="Record payment" onPress={() => navigation.navigate('Org Detail', { orgId: o.id })} />
              </Btns>
            </View>
          </Card>
        );
      })}

      {/* ── Tenancy ── */}
      <SectionHead title="Tenancy" />
      <Card>
        <View style={styles.seg}>
          {tenancy === 0 ? <View style={[styles.segPart, { flex: 1, backgroundColor: colors.bgSunken }]} /> : null}
          {paying > 0 ? <View style={[styles.segPart, { flex: paying, backgroundColor: '#0FA968' }]} /> : null}
          {trial > 0 ? <View style={[styles.segPart, { flex: trial, backgroundColor: '#3B82F6' }]} /> : null}
          {overdue > 0 ? <View style={[styles.segPart, { flex: overdue, backgroundColor: '#F59E0B' }]} /> : null}
          {cancelled > 0 ? <View style={[styles.segPart, { flex: cancelled, backgroundColor: '#C3C8D4' }]} /> : null}
        </View>
        <View style={styles.four}>
          <Count value={paying} label="Paying" color={tint.success.text} />
          <Count value={trial} label="On trial" color={tint.info.text} />
          <Count value={overdue} label="Overdue" color={overdue > 0 ? tint.warning.text : colors.text} />
          <Count value={cancelled} label="Cancelled" color={colors.textMuted} />
        </View>
      </Card>

      {/* ── New organisations ── */}
      {newest.length > 0 ? (
        <>
          <SectionHead title="New organisations" />
          <Card flush>
            {newest.map((o, i) => (
              <Row
                key={o.id}
                leading={<Initials name={o.name} index={i} />}
                title={o.name}
                sub={`Joined ${joined(o.onboarded_at || o.created_at)} · ${standing(o)}`}
                chevron
                last={i === newest.length - 1}
                onPress={() => navigation.navigate('Org Detail', { orgId: o.id })}
              />
            ))}
          </Card>
        </>
      ) : null}

      {/* ── The price list ── */}
      <View style={styles.plansHead}>
        <SectionHead title="Plans" count={plans.length} countColor={colors.primary} />
        <Btn small icon="plus" title="New plan" onPress={openNew} />
      </View>
      {plans.length === 0 ? (
        <Card flush><Row title="No plans yet" sub="Create the plans you sell against" last /></Card>
      ) : plans.map((p: any) => (
        <Card key={p.id} style={!p.active ? styles.planOff : undefined}>
          <View style={styles.planHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.planName} numberOfLines={1}>{p.name}</Text>
              <Text style={kitStyles.k} numberOfLines={1}>
                {p.code} · {p.max_branches == null ? 'unlimited branches' : `up to ${p.max_branches} branch${p.max_branches === 1 ? '' : 'es'}`}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.planPrice}>{Number(p.price_ugx) > 0 ? ugx(p.price_ugx) : 'Free'}</Text>
              <Text style={kitStyles.k}>{p.billing_cycle}</Text>
            </View>
          </View>
          {p.description ? <Text style={styles.planDesc} numberOfLines={2}>{p.description}</Text> : null}
          <View style={styles.planFoot}>
            <Pill tone={Number(p.org_count) > 0 ? 'info' : 'neutral'} label={`${p.org_count} org${Number(p.org_count) === 1 ? '' : 's'}`} />
            {Number(p.paying_org_count) > 0 ? <Pill tone="ok" label={`${p.paying_org_count} paying`} /> : null}
            {!p.active ? <Pill tone="neutral" label="Retired" /> : null}
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => openEdit(p)} hitSlop={8} activeOpacity={0.6}>
              <Text style={styles.planAction}>Edit</Text>
            </TouchableOpacity>
            <Text style={kitStyles.k}>·</Text>
            <TouchableOpacity onPress={() => toggleActive(p)} hitSlop={8} activeOpacity={0.6}>
              <Text style={[styles.planAction, { color: p.active ? colors.textSecondary : tint.success.text }]}>{p.active ? 'Retire' : 'Restore'}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}

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
          hint="Use 0 for a free or trial plan. Retiring a plan hides it from new assignments."
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
    </AdminScreen>
  );
}

/** One of the Tenancy counts. */
function Count({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.countValue, { color }]}>{value}</Text>
      <Text style={kitStyles.k}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardLabel: { fontSize: 12, ...jk.semibold, color: colors.textSecondary },
  mrrRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6, marginBottom: 6 },
  mrrUnit: { fontSize: 16, ...jk.bold, color: colors.textSecondary },
  mrr: { flexShrink: 1, fontSize: 40, lineHeight: 46, ...jk.heavy, color: colors.text, ...staffType.tabular },

  empty: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: tint.success.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 17, ...jk.heavy, color: colors.text },
  emptySub: { fontSize: 14, lineHeight: 20, ...jk.medium, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },

  chaseHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chaseName: { fontSize: 15, ...jk.heavy, color: colors.text },

  seg: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  segPart: { borderRadius: 6 },
  four: { flexDirection: 'row', gap: 6, marginTop: 16 },
  countValue: { fontSize: 24, lineHeight: 30, ...jk.heavy, ...staffType.tabular },

  plansHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  planOff: { opacity: 0.6 },
  planHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  planName: { fontSize: 16, ...jk.heavy, color: colors.text },
  planPrice: { fontSize: 18, ...jk.heavy, color: colors.text, ...staffType.tabular },
  planDesc: { fontSize: 13, lineHeight: 18, ...jk.medium, color: colors.textSecondary, marginTop: 8 },
  planFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: soft.line },
  planAction: { fontSize: 13, ...jk.bold, color: soft.text },
});
