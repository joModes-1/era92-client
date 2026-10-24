import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, orgBg } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader, { HeaderStat } from '../../components/ScreenHeader';
import { useAppAlert } from '../../components/AppAlert';
import {
  Surface, SectionHeader, EmptyState, ListRow, SkeletonList,
  Field, SearchField, FormSheet, initials,
} from '../../components/ui';

const PAGE_SIZE = 50;

export default function CustomersScreen() {
  const alert = useAppAlert();
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<any>(null);
  const [pointsDelta, setPointsDelta] = useState('0');
  const [reason, setReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // The directory is not capped at a page: PAGE_SIZE is how much arrives per
  // request, and "Load more" walks the rest. An org with thousands of members
  // was previously truncated at 50 with nothing to say so.
  const load = useCallback(async (q?: string) => {
    try {
      const data = await api.searchClients(q, PAGE_SIZE, 0);
      setClients(data.clients || []);
      setTotal(data.total || 0);
    } catch {}
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || clients.length >= total) return;
    setLoadingMore(true);
    try {
      const data = await api.searchClients(query || undefined, PAGE_SIZE, clients.length);
      // Concatenating on an offset can duplicate a row if a customer registers
      // mid-scroll and shifts the ordering, so de-duplicate on id.
      setClients((prev) => {
        const seen = new Set(prev.map((c: any) => c.id));
        return [...prev, ...(data.clients || []).filter((c: any) => !seen.has(c.id))];
      });
      setTotal(data.total || 0);
    } catch {}
    setLoadingMore(false);
  }, [clients.length, total, query, loadingMore]);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(query || undefined);
    setRefreshing(false);
  };

  const handleSearch = async (text: string) => {
    setQuery(text);
    await load(text || undefined);
  };

  const openAdjust = (client: any) => {
    setAdjustTarget(client);
    setPointsDelta('0');
    setReason('');
  };

  const submitAdjust = async () => {
    const pd = parseInt(pointsDelta, 10) || 0;
    if (pd === 0) {
      alert('No change', 'Enter how many points to add (or a negative number to remove).');
      return;
    }
    if (Number(adjustTarget.points_balance || 0) + pd < 0) {
      alert('Too many points', `They only have ${Number(adjustTarget.points_balance || 0)} points.`);
      return;
    }
    if (reason.trim().length < 3) {
      alert('Reason required', 'Explain why you are adjusting this account.');
      return;
    }
    setAdjusting(true);
    try {
      await api.adjustClientPoints(adjustTarget.id, pd, reason.trim());
      setAdjustTarget(null);
      await load(query || undefined);
      alert('Adjusted', `${adjustTarget.full_name}'s points have been updated.`);
    } catch (e: any) {
      alert('Error', e.message);
    }
    setAdjusting(false);
  };

  if (!loaded) {
    return (
      <View style={[styles.container, orgBg()]}>
        <ScreenHeader title="Customers" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={6} showHeader={false} /></ScrollView>
      </View>
    );
  }

  // Counted over what has loaded — labelled as such, never presented as an
  // org-wide figure it is not.
  const withPoints = clients.filter((c: any) => Number(c.points_balance || 0) > 0).length;

  return (
    <View style={[styles.container, orgBg()]}>
      <ScreenHeader
        title="Customers"
        subtitle={
          query
            ? `${total} match${total === 1 ? '' : 'es'}`
            : `${total.toLocaleString()} registered`
        }
      >
        <HeaderStat label="With points" value={withPoints} icon="award" />
        <HeaderStat label="Showing" value={`${clients.length}/${total}`} icon="list" />
      </ScreenHeader>

      <View style={styles.searchBar}>
        <SearchField value={query} onChangeText={handleSearch} placeholder="Name or phone" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {clients.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState
              icon={query ? 'search' : 'address-book'}
              title={query ? 'No matches' : 'No customers yet'}
              message={query ? 'Try a different name or phone.' : 'Customers appear here once they register.'}
            />
          </Surface>
        ) : (
          <>
            <SectionHeader title={query ? 'Results' : 'All customers'} count={clients.length} />
            <Surface elevation="sm" padded="sm">
              {clients.map((c: any, i: number) => {
                const pts = Number(c.points_balance || 0);
                return (
                  <ListRow
                    key={c.id}
                    onPress={() => openAdjust(c)}
                    leading={initials(c.full_name)}
                    leadingTone={pts > 0 ? 'accent' : 'neutral'}
                    title={c.full_name}
                    subtitle={c.phone}
                    last={i === clients.length - 1}
                    trailing={
                      <View style={styles.right}>
                        <Text style={styles.washes}>
                          <Text style={styles.washNum}>{Number(c.settled_washes || 0)}</Text> washes
                        </Text>
                        {pts > 0 ? (
                          <View style={styles.creditPill}>
                            <Icon name="award" size={8} color={colors.accent} />
                            <Text style={styles.creditText}>{pts.toLocaleString()} pts</Text>
                          </View>
                        ) : null}
                      </View>
                    }
                  />
                );
              })}
            </Surface>

            {clients.length < total ? (
              <TouchableOpacity
                style={styles.moreBtn}
                onPress={loadMore}
                disabled={loadingMore}
                activeOpacity={0.75}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Icon name="chevron-down" size={10} color={colors.primary} />
                    <Text style={styles.moreText}>
                      Load {Math.min(PAGE_SIZE, total - clients.length)} more
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              total > PAGE_SIZE && (
                <Text style={styles.endText}>
                  That is all {total.toLocaleString()} customers.
                </Text>
              )
            )}
          </>
        )}
      </ScrollView>

      <FormSheet
        visible={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title="Adjust points"
        subtitle={adjustTarget?.full_name}
        submitLabel="Apply adjustment"
        onSubmit={submitAdjust}
        submitting={adjusting}
      >
        {/* Current standing, so the admin adjusts from a known baseline */}
        {adjustTarget ? (
          <Surface elevation="none" tone={colors.bgSunken} borderless style={styles.current}>
            <View style={styles.currentItem}>
              <Text style={styles.currentValue}>{Number(adjustTarget.settled_washes || 0)}</Text>
              <Text style={styles.currentLabel}>Washes</Text>
            </View>
            <View style={styles.currentDivider} />
            <View style={styles.currentItem}>
              <Text style={styles.currentValue}>{Number(adjustTarget.points_balance || 0).toLocaleString()}</Text>
              <Text style={styles.currentLabel}>Points</Text>
            </View>
          </Surface>
        ) : null}

        <Field
          label="Points to add"
          value={pointsDelta}
          onChangeText={setPointsDelta}
          keyboardType="numbers-and-punctuation"
          placeholder="e.g. 50 or -20"
          hint="Use a negative number to remove points."
        />
        <Field
          label="Reason"
          required
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Goodwill after a dispute"
          multiline
          hint="Recorded in the audit log."
        />
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },

  moreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    minHeight: 44, borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  moreText: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.primaryText },
  endText: { fontSize: font.xs, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.sm },

  right: { alignItems: 'flex-end', gap: 4 },
  washes: { fontSize: font.xs, color: colors.textMuted },
  washNum: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text },
  creditPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accentSoft, borderRadius: radii.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  creditText: { fontSize: font.xs, fontWeight: weight.heavy, color: colors.accentText },

  current: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  currentItem: { flex: 1, alignItems: 'center', gap: 2 },
  currentDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  currentValue: { fontSize: font.xxl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },
  currentLabel: { fontSize: font.xs, fontWeight: weight.semibold, color: colors.textMuted },
});
