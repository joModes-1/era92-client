import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import AdminScreen from '../../components/admin/AdminScreen';
import BranchSheet, { BranchOption } from '../../components/admin/BranchSheet';
import { Card, Section, Row, Pill, Chip, Chips } from '../../components/admin/kit';
import { daysAgo, isoLocal } from './adminData';
import { ALERT_GROUPS, buildAlerts } from './alerts';

/**
 * Every alert the Home's "Needs attention" draws from, grouped by kind:
 * stuck cars, cash held too long, shortfalls and payments to review. Each
 * row opens the page — and the tab — where it gets dealt with.
 */
export default function AlertsScreen() {
  const navigation = useNavigation<any>();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [branchList, setBranchList] = useState<BranchOption[]>([]);
  const [d, setD] = useState<any>(null);

  const load = useCallback(async () => {
    const today = isoLocal(new Date());
    const [wallets, stale, exc, variance, list] = await Promise.allSettled([
      api.listWallets(branchId || undefined),
      api.stale(),
      api.exceptions(daysAgo(7), today),
      api.cashVariance(daysAgo(7), today),
      api.listBranches(),
    ]);
    const v = (r: PromiseSettledResult<any>) => (r.status === 'fulfilled' ? r.value : null);
    if (v(list)) setBranchList((v(list) as any[]).map((x) => ({ id: x.id, name: x.name })));
    setD({ wallets: v(wallets), stale: v(stale), exceptions: v(exc) || [], variance: v(variance) });
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const branchName = branchList.find((b) => b.id === branchId)?.name || null;
  const alerts = buildAlerts(d || {}, (name) => !branchName || name === branchName);

  return (
    <AdminScreen
      title="Alerts"
      subtitle={d ? (alerts.length ? `${alerts.length} need${alerts.length === 1 ? 's' : ''} you` : 'All clear') : undefined}
      loading={!d}
      onRefresh={load}
    >
      <Chips>
        <Chip label={branchName || 'All branches'} caret onPress={() => setPicking(true)} />
      </Chips>

      {alerts.length === 0 ? (
        <Card flush>
          <Row leading={<Pill tone="ok" label="Clear" />} title="Nothing needs you right now" sub="No stuck cars, cash held too long or payments to check" last />
        </Card>
      ) : ALERT_GROUPS.map((g) => {
        const items = alerts.filter((a) => a.kind === g.kind);
        if (!items.length) return null;
        return (
          <React.Fragment key={g.kind}>
            <Section title={`${g.title} · ${items.length}`} />
            <Card flush>
              {items.map((a, i) => (
                <Row
                  key={a.key}
                  leading={<Pill tone={a.tone} label={a.pill} />}
                  title={a.title}
                  sub={a.sub}
                  chevron
                  last={i === items.length - 1}
                  onPress={() => navigation.navigate(a.go, a.params)}
                />
              ))}
            </Card>
          </React.Fragment>
        );
      })}

      <BranchSheet visible={picking} onClose={() => setPicking(false)} branches={branchList} value={branchId} onPick={setBranchId} />
    </AdminScreen>
  );
}
