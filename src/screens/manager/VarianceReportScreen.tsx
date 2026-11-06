import React, { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { api } from '../../api';
import { tint, jk } from '../../theme';
import AdminScreen from '../../components/admin/AdminScreen';
import { useReport } from '../../components/admin/useReport';
import {
  Card, Section, Grid2, Tile, Pill, PillTone, Row, Chip, Chips, IconChip, KeyFig, TintTone, kitStyles,
} from '../../components/admin/kit';
import { daysAgo, isoLocal, weekday, compact } from '../orgadmin/adminData';

type Range = 1 | 7 | 30;
const RANGES: { value: Range; label: string }[] = [
  { value: 1, label: 'Today' },
  { value: 7, label: 'This week' },
  { value: 30, label: '30 days' },
];

const ugx = (n: number) => `UGX ${Math.abs(n).toLocaleString()}`;
/** Word first, never a bare signed number: "Short UGX 3,000", "Over UGX 500". */
const result = (v: number) => (v < 0 ? `Short ${ugx(v)}` : v > 0 ? `Over ${ugx(v)}` : 'Balanced');
const toneOf = (v: number): { pill: PillTone; tint: TintTone } =>
  v < 0 ? { pill: 'bad', tint: 'error' } : v > 0 ? { pill: 'blue', tint: 'info' } : { pill: 'ok', tint: 'success' };

/**
 * Cash Variance, after the "Lovable" artboard: what the counted shifts
 * should have handed in against the difference, each branch's expected and
 * counted side by side, then every shift that didn't match. Only cash is
 * counted — mobile money settles itself.
 */
export default function VarianceReportScreen() {
  const [range, setRange] = useState<Range>(7);
  const load = useCallback(() => {
    const to = isoLocal(new Date());
    return api.cashVariance(range === 1 ? to : daysAgo(range - 1), to);
  }, [range]);
  const { data, error, loading, reload } = useReport<any>(load);

  const branches: any[] = data?.branches || [];
  const shifts: any[] = data?.shifts || [];
  const expected = branches.reduce((t, b) => t + Number(b.expected_ugx || 0), 0);
  const diff = branches.length
    ? branches.reduce((t, b) => t + Number(b.variance_ugx || 0), 0)
    : shifts.reduce((t, s) => t + Number(s.variance_ugx || 0), 0);
  const counted = branches.reduce((t, b) => t + Number(b.shifts || 0), 0);
  const word = range === 1 ? 'today' : range === 7 ? 'this week' : 'in the last 30 days';

  return (
    <AdminScreen
      title="Cash Variance"
      subtitle={`${range === 1 ? 'Today' : range === 7 ? 'This week' : 'Last 30 days'} · counted vs expected`}
      back
      loading={loading}
      onRefresh={reload}
    >
      <Chips>
        {RANGES.map((r) => <Chip key={r.value} label={r.label} on={range === r.value} onPress={() => setRange(r.value)} />)}
      </Chips>

      {error ? (
        <Card flush><Row leading={<IconChip icon="exclamation-triangle" tone="error" />} title="Couldn't load cash variance" sub={error} last /></Card>
      ) : (
        <>
          <Grid2>
            <Tile icon="balance-scale" tone="primary" label="Expected" small
              value={branches.length ? expected.toLocaleString() : '—'}
              sub={branches.length ? `UGX · ${counted} shift${counted === 1 ? '' : 's'} counted` : 'UGX'} />
            <Tile icon="exclamation-triangle" tone={toneOf(diff).tint} label="Difference" small
              value={diff === 0 ? '0' : `${diff < 0 ? '-' : '+'}${Math.abs(diff).toLocaleString()}`}
              valueColor={diff === 0 ? undefined : tint[toneOf(diff).tint].text}
              sub={diff < 0 ? 'UGX short' : diff > 0 ? 'UGX over' : 'All balanced'} />
          </Grid2>

          {branches.length > 0 ? (
            <>
              <Section title="By branch" />
              {branches.map((b) => {
                const v = Number(b.variance_ugx || 0);
                const t = toneOf(v);
                const off = Number(b.mismatched || 0);
                return (
                  <Card key={b.branch_id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <IconChip icon="store" tone={t.tint} />
                      <View style={{ flex: 1 }}>
                        <Text style={kitStyles.name} numberOfLines={1}>{b.branch_name}</Text>
                        <Text style={kitStyles.k}>{b.shifts} shift{Number(b.shifts) === 1 ? '' : 's'}{off ? ` · ${off} off` : ''}</Text>
                      </View>
                      <Pill tone={t.pill} label={v === 0 ? 'Balanced' : `${v < 0 ? '-' : '+'}${ugx(v)}`} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                      <KeyFig label="Expected" value={ugx(Number(b.expected_ugx || 0))} />
                      <KeyFig label="Counted" value={ugx(Number(b.counted_ugx || 0))} />
                    </View>
                  </Card>
                );
              })}
            </>
          ) : null}

          <Section
            title="Shifts that didn't match"
            right={shifts.length ? <Pill tone="neutral" label={String(shifts.length)} /> : undefined}
          />
          <Card flush>
            {shifts.length === 0 ? (
              <Row leading={<IconChip icon="check" tone="success" />} title="Every shift balanced" sub={`No cash differences ${word}`} last />
            ) : shifts.map((s, i) => {
              const v = Number(s.variance_ugx || 0);
              const t = toneOf(v);
              return (
                <Row
                  key={s.id || i}
                  leading={<IconChip icon={v < 0 ? 'arrow-down' : 'arrow-up'} tone={t.tint} />}
                  title={s.worker_name}
                  sub={`${weekday(String(s.date).slice(0, 10))} · ${s.branch_name}`}
                  trailing={<Pill tone={t.pill} label={`${v < 0 ? 'Short' : 'Over'} ${compact(Math.abs(v))}`} />}
                  last={i === shifts.length - 1}
                />
              );
            })}
          </Card>

        </>
      )}
    </AdminScreen>
  );
}
