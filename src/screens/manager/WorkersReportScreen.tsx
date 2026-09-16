import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../api';
import { colors, font, spacing, weight, tracking, radii, shadow } from '../../theme';
import { ReportScreen, rangeLabel, today, weekAgo } from './reportHelpers';
import { Surface, SectionHeader, MetricStrip, MiniBar, EmptyState, initials } from '../../components/ui';
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
                    // The top earner gets a real hero treatment — a gradient
                    // card and a trophy, not the same white box as everyone.
                    <LinearGradient
                      key={i}
                      colors={colors.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.topCard}
                    >
                      <View style={styles.topBloom} pointerEvents="none" />
                      <View style={styles.topBadge}>
                        <Icon name="trophy" size={11} color={colors.accent} />
                        <Text style={styles.topBadgeText}>TOP EARNER</Text>
                      </View>

                      <View style={styles.top}>
                        <View style={styles.topAvatar}>
                          <Text style={styles.topAvatarText}>{initials(w.full_name)}</Text>
                        </View>
                        <View style={styles.who}>
                          <Text style={styles.topName} numberOfLines={1}>{w.full_name}</Text>
                          <Text style={styles.topMeta}>{completion}% completed · {started} washes</Text>
                        </View>
                      </View>

                      <View style={styles.topCashRow}>
                        <Text style={styles.topCurrency}>UGX</Text>
                        <Text style={styles.topCash} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                          {cash.toLocaleString()}
                        </Text>
                      </View>

                      <View style={styles.topDivider} />

                      <View style={styles.topStrip}>
                        <View style={styles.topStat}>
                          <Text style={styles.topStatValue}>{settled}</Text>
                          <Text style={styles.topStatLabel}>SETTLED</Text>
                        </View>
                        <View style={styles.topStatDivider} />
                        <View style={styles.topStat}>
                          <Text style={styles.topStatValue}>{inH}</Text>
                          <Text style={styles.topStatLabel}>TAKEN IN</Text>
                        </View>
                        <View style={styles.topStatDivider} />
                        <View style={styles.topStat}>
                          <Text style={[styles.topStatValue, unverified > 0 && { color: '#FFE5EC' }]}>{unverified}</Text>
                          <Text style={styles.topStatLabel}>UNVERIFIED</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  ) : (
                    <Surface key={i} elevation="sm" style={styles.card}>
                      <View style={styles.top}>
                        <View style={styles.rank}>
                          <Text style={styles.rankText}>{initials(w.full_name)}</Text>
                        </View>

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
                          <Text style={styles.cashUnit}>UGX CASH</Text>
                        </View>
                      </View>

                      <MiniBar value={cash} max={topCash} color={colors.ink[300]} />

                      <MetricStrip
                        style={styles.strip}
                        items={[
                          { label: 'Started', value: started },
                          { label: 'Settled', value: settled, tone: 'success' },
                          { label: 'Taken in', value: inH, tone: inH > 0 ? 'info' : undefined },
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
                      <View style={styles.idleAvatar}>
                        <Text style={styles.idleAvatarText}>{initials(w.full_name)}</Text>
                      </View>
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
                      <View style={styles.idleAvatar}>
                        <Text style={styles.idleAvatarText}>{initials(w.full_name)}</Text>
                      </View>
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
  rank: {
    width: 40, height: 40, borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.textSecondary },
  who: { flex: 1, gap: 3 },
  name: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  meta: { fontSize: font.xs, color: colors.textMuted, fontWeight: weight.medium },
  cashCol: { alignItems: 'flex-end' },
  cash: { fontSize: font.xl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },
  cashUnit: { fontSize: font.micro, fontWeight: weight.bold, color: colors.textMuted, letterSpacing: tracking.caps },
  strip: { paddingTop: spacing.xs },

  // Top-earner hero card
  topCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    gap: spacing.md,
    ...shadow.brand,
  },
  topBloom: {
    position: 'absolute', top: -70, right: -50,
    width: 170, height: 170, borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  topBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radii.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  topBadgeText: { fontSize: 10, fontWeight: weight.heavy, color: '#fff', letterSpacing: tracking.caps },
  topAvatar: {
    width: 44, height: 44, borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center', justifyContent: 'center',
  },
  topAvatarText: { fontSize: font.regular, fontWeight: weight.heavy, color: '#fff' },
  topName: { fontSize: font.lg, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.tight },
  topMeta: { fontSize: font.xs, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  topCashRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  topCurrency: { fontSize: font.regular, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.8)' },
  topCash: { fontSize: font.display, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.display },
  topDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.3)' },
  topStrip: { flexDirection: 'row', alignItems: 'center' },
  topStat: { flex: 1, gap: 2 },
  topStatValue: { fontSize: font.lg, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.tight },
  topStatLabel: { fontSize: 9, fontWeight: weight.bold, color: 'rgba(255,255,255,0.75)', letterSpacing: tracking.caps },
  topStatDivider: { width: StyleSheet.hairlineWidth, height: 24, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: spacing.md },

  // Idle roster
  idleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  idleRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  idleAvatar: {
    width: 26, height: 26, borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
  },
  idleAvatarText: { fontSize: 10, fontWeight: weight.bold, color: colors.textMuted },
  idleName: { flex: 1, fontSize: font.sm, color: colors.textSecondary, fontWeight: weight.medium },
  idleTag: { fontSize: font.micro, fontWeight: weight.bold, color: colors.textMuted, letterSpacing: tracking.caps },

  // Fixed width so the rank column stays aligned once it reaches two digits.
  restRank: { width: 18, fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, textAlign: 'center' },
  restCash: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary },
});
