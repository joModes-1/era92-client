import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, font, spacing, weight, tracking, radii, typography } from '../../theme';
import { ReportScreen, rangeLabel, today, weekAgo } from './reportHelpers';
import { Surface, SectionHeader, MetricStrip, MiniBar, EmptyState, Avatar, HeroCard } from '../../components/ui';
import { HeaderStat } from '../../components/ScreenHeader';
import Icon from '../../components/Icon';
import Badge from '../../components/Badge';

const ugx = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function WorkersReportScreen() {
  const from = weekAgo();
  const to = today();

  return (
    <ReportScreen
      title="Performance"
      subtitle={rangeLabel(from, to)}
      load={() => api.workers(from, to)}
      headerRail={(data) => {
        if (!Array.isArray(data) || data.length === 0) return null;
        const cash = data.reduce((s: number, w: any) => s + Number(w.cash_taken_ugx || 0), 0);
        const settled = data.reduce((s: number, w: any) => s + Number(w.washes_settled || 0), 0);
        return (
          <>
            <HeaderStat label="Team cash" value={ugx(cash)} icon="coins" />
            <HeaderStat label="Settled" value={settled} icon="check-circle" />
          </>
        );
      }}
      render={(data) => {
        if (!Array.isArray(data)) return null;
        if (data.length === 0) {
          return <EmptyState icon="hard-hat" title="No worker activity" message="Nobody logged a wash in this period." />;
        }

        // Active workers earn the leaderboard treatment; a worker with zero
        // activity is not "in last place" — they simply had nothing to do
        // with this period, and giving them equal visual weight as the top
        // earner is what made the whole screen read as flat, undifferentiated
        // rows of zeros.
        const ranked = [...data]
          .filter((w) => Number(w.washes_started || 0) > 0)
          .sort((a, b) => Number(b.cash_taken_ugx || 0) - Number(a.cash_taken_ugx || 0));
        const idle = data.filter((w) => Number(w.washes_started || 0) === 0);
        const topCash = Math.max(...ranked.map((w) => Number(w.cash_taken_ugx || 0)), 1);

        // A leaderboard is the top of the field, not the whole field. On a
        // full crew the ranked list ran to a dozen near-identical cards and
        // the standings stopped being readable, so only the leading six get
        // the ranked treatment and everyone else is summarised below —
        // still present and still counted, just not pretending to be a
        // podium place.
        const BOARD_SIZE = 6;
        const board = ranked.slice(0, BOARD_SIZE);
        const rest = ranked.slice(BOARD_SIZE);

        return (
          <View style={{ gap: spacing.lg }}>
            {ranked.length === 0 ? (
              <EmptyState icon="hard-hat" title="No worker activity" message="Nobody logged a wash in this period." />
            ) : (
              <View style={{ gap: spacing.md }}>
                <SectionHeader title="Leaderboard" count={ranked.length} icon="trophy" />

                {board.map((w: any, i: number) => {
                  const started = Number(w.washes_started || 0);
                  const settled = Number(w.washes_settled || 0);
                  const cash = Number(w.cash_taken_ugx || 0);
                  const unverified = Number(w.unverified_count || 0);
                  const inH = Number(w.handovers_received || 0);
                  const outH = Number(w.handovers_given || 0);
                  const completion = started > 0 ? Math.round((settled / started) * 100) : 0;
                  const isTop = i === 0;

                  return isTop ? (
                    // The top earner gets the screen's one brand card — the
                    // same hero every role's headline figure uses.
                    <HeroCard
                      key={i}
                      label={w.full_name}
                      badge={
                        <View style={styles.topBadge}>
                          <Icon name="trophy" size={12} color={colors.accent} />
                          <Text style={styles.topBadgeText}>Top earner</Text>
                        </View>
                      }
                      prefix="UGX"
                      value={cash.toLocaleString()}
                      caption={`${completion}% completed · ${started} washes`}
                      stats={[
                        { label: 'Settled', value: settled },
                        { label: 'Taken in', value: inH },
                        { label: 'Unverified', value: unverified, alert: unverified > 0 },
                      ]}
                    />
                  ) : (
                    <Surface key={i} elevation="sm" style={styles.card}>
                      <View style={styles.top}>
                        <Avatar name={w.full_name} size={40} />

                        <View style={styles.who}>
                          <Text style={styles.name} numberOfLines={1}>{w.full_name}</Text>
                          <View style={styles.metaRow}>
                            <Text style={styles.meta}>{completion}% completed</Text>
                            {unverified > 0 ? (
                              <Badge label={`${unverified} unverified`} tone="error" small />
                            ) : null}
                          </View>
                        </View>

                        <View style={styles.cashCol}>
                          <Text style={styles.cash} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                            {cash.toLocaleString()}
                          </Text>
                          <Text style={styles.cashUnit}>UGX cash</Text>
                        </View>
                      </View>

                      <MiniBar value={cash} max={topCash} color={colors.primaryTint} />

                      <MetricStrip
                        style={styles.strip}
                        items={[
                          { label: 'Started', value: started },
                          { label: 'Settled', value: settled },
                          { label: 'Taken in', value: inH },
                          { label: 'Passed on', value: outH },
                        ]}
                      />
                    </Surface>
                  );
                })}
              </View>
            )}

            {/* Everyone below the top six. They worked and their cash counts,
                so they are listed with their number — just not given a
                podium card, which is what made a full crew unreadable. */}
            {rest.length > 0 && (
              <View>
                <SectionHeader title="Also working" count={rest.length} icon="users" />
                <Surface elevation="sm" padded="sm" style={{ gap: 0 }}>
                  {rest.map((w: any, i: number) => (
                    <View key={i} style={[styles.idleRow, i < rest.length - 1 && styles.idleRowBorder]}>
                      <Text style={styles.restRank}>{i + BOARD_SIZE + 1}</Text>
                      <Avatar name={w.full_name} size={28} />
                      <Text style={styles.idleName} numberOfLines={1}>{w.full_name}</Text>
                      <Text style={styles.restCash} numberOfLines={1}>
                        {Number(w.cash_taken_ugx || 0).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </Surface>
              </View>
            )}

            {/* Idle staff are named, not hidden, but kept visually quiet — a
                thin roster row instead of a full zeroed-out card each. */}
            {idle.length > 0 && (
              <View>
                <SectionHeader title="No activity this period" count={idle.length} icon="moon" />
                <Surface elevation="sm" padded="sm" style={{ gap: 0 }}>
                  {idle.map((w: any, i: number) => (
                    <View key={i} style={[styles.idleRow, i < idle.length - 1 && styles.idleRowBorder]}>
                      <Avatar name={w.full_name} size={28} variant="muted" />
                      <Text style={styles.idleName} numberOfLines={1}>{w.full_name}</Text>
                      <Text style={styles.idleTag}>Idle</Text>
                    </View>
                  ))}
                </Surface>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  who: { flex: 1, gap: 3 },
  name: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  meta: { fontSize: font.sm, color: colors.textMuted, fontWeight: weight.medium },
  cashCol: { alignItems: 'flex-end' },
  cash: { fontSize: font.xl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  cashUnit: typography.label,
  strip: { paddingTop: spacing.xs },

  topBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  topBadgeText: { fontSize: 12, fontWeight: weight.semibold, color: colors.accentText },

  // Idle roster
  idleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2 },
  idleRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  idleName: { flex: 1, fontSize: font.regular, color: colors.textSecondary, fontWeight: weight.medium },
  idleTag: { fontSize: font.xs, fontWeight: weight.semibold, color: colors.textMuted },

  // Fixed width so the rank column stays aligned once it reaches two digits.
  restRank: { width: 18, fontSize: font.xs, fontWeight: weight.heavy, color: colors.textMuted, textAlign: 'center' },
  restCash: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
});
