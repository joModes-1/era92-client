import React, { useCallback } from 'react';
import { View, Text, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import AdminScreen from '../../components/admin/AdminScreen';
import { useReport } from '../../components/admin/useReport';
import {
  Card, Tile, Pill, Row, Btn, Btns, IconChip, MetaRow, kitStyles,
} from '../../components/admin/kit';
import { duration, clock } from '../orgadmin/adminData';

/** Over an hour is critical (red); under it is overdue (orange). */
const CRITICAL_MIN = 60;

/** A figure that fits a third of the screen: "34m", "3h", "13d". */
const short = (m: number) => (m < 60 ? `${Math.round(m)}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`);

/**
 * Stale Alerts, after the "Lovable" artboard: how many cars are stuck, the
 * oldest, how many are stuck at payment — then a card per car with what's
 * wrong, how long, where and who, and a call to the worker (and, for the org
 * admin, a jump to Live jobs).
 */
export default function StaleReportScreen() {
  const navigation = useNavigation<any>();
  const load = useCallback(() => api.stale(), []);
  const { data, error, loading, reload } = useReport<any>(load);
  const hasLiveJobs = (navigation.getState?.()?.routeNames || []).includes('Live Jobs');

  const ready: any[] = (data?.stale_ready || []).map((w: any) => ({ ...w, atPayment: true, mins: Number(w.minutes_ready || 0) }));
  const open: any[] = (data?.long_in_progress || []).map((w: any) => ({ ...w, atPayment: false, mins: Number(w.minutes_open || 0) }));
  const all = [...ready, ...open].sort((a, b) => b.mins - a.mins);
  const oldest = all[0]?.mins || 0;

  const card = (w: any) => {
    const critical = w.mins >= CRITICAL_MIN;
    return (
      <Card key={w.id}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <IconChip icon="exclamation-triangle" tone={critical ? 'error' : 'warning'} />
          <View style={{ flex: 1 }}>
            <Text style={kitStyles.plate} numberOfLines={1}>{w.plate || w.job_no}</Text>
            <Text style={[kitStyles.k, { fontSize: 13, marginTop: 3 }]}>
              {w.atPayment ? 'Washed and ready, not paid' : 'Still washing, not marked done'}
            </Text>
          </View>
          <Pill tone={critical ? 'bad' : 'warn'} label={duration(w.mins)} />
        </View>
        <View style={{ marginLeft: 52 }}>
          <MetaRow items={[
            { icon: 'map-marker-alt', text: w.branch_name },
            { icon: 'user', text: w.worker_name || '' },
            { icon: 'clock', text: w.atPayment ? `Stuck at payment` : `Started ${clock(w.started_at)}` },
          ]} />
        </View>
        {w.worker_phone || hasLiveJobs ? (
          <View style={{ marginTop: 14 }}>
            <Btns>
              {w.worker_phone ? (
                <Btn icon="phone" title="Call worker" onPress={() => Linking.openURL(`tel:${w.worker_phone}`).catch(() => {})} />
              ) : null}
              {hasLiveJobs ? (
                <Btn primary title="Open in Live jobs" onPress={() => navigation.navigate('Live Jobs', { view: 'stuck' })} />
              ) : null}
            </Btns>
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <AdminScreen
      title="Stale Alerts"
      subtitle={data ? (all.length ? `${all.length} car${all.length === 1 ? '' : 's'} need${all.length === 1 ? 's' : ''} attention` : 'Every car is moving') : undefined}
      back
      loading={loading}
      onRefresh={reload}
    >
      {error ? (
        <Card flush><Row leading={<IconChip icon="exclamation-triangle" tone="error" />} title="Couldn't load stale alerts" sub={error} last /></Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Tile tone="error" label="Stuck" value={String(all.length)} small /></View>
            <View style={{ flex: 1 }}><Tile tone="warning" label="Oldest" value={oldest ? short(oldest) : '—'} small /></View>
            <View style={{ flex: 1 }}><Tile tone="info" label="At payment" value={String(ready.length)} small /></View>
          </View>

          {all.length ? all.map(card) : (
            <Card flush>
              <Row leading={<IconChip icon="check" tone="success" />} title="Nothing is stale" sub="Every car is moving within its time" last />
            </Card>
          )}

        </>
      )}
    </AdminScreen>
  );
}
