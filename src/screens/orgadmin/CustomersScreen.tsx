import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
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
  const [washDelta, setWashDelta] = useState('0');
  const [creditDelta, setCreditDelta] = useState('0');
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
    setWashDelta('0');
    setCreditDelta('0');
    setReason('');
  };

  const submitAdjust = async () => {
    const wd = parseInt(washDelta, 10) || 0;
    const cd = parseInt(creditDelta, 10) || 0;
    if (wd === 0 && cd === 0) {
      alert('No change', 'Set a non-zero wash or credit adjustment.');
      return;
    }
    if (!reason.trim()) {
      alert('Reason required', 'Explain why you are adjusting this account.');
      return;
    }
    setAdjusting(true);
    try {
      await api.adjustClientLoyalty(adjustTarget.id, { wash_delta: wd, credit_delta: cd, reason: reason.trim() });
      setAdjustTarget(null);
      await load(query || undefined);
      alert('Adjusted', `${adjustTarget.full_name}'s loyalty account has been updated.`);
    } catch (e: any) {
      alert('Error', e.message);
    }
    setAdjusting(false);
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Customers" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={6} showHeader={false} /></ScrollView>
      </View>
    );
  }

  // Counted over what has loaded — labelled as such, never presented as an
  // org-wide figure it is not.
  const withCredits = clients.filter((c: any) => Number(c.free_wash_credits || 0) > 0).length;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Customers"
        subtitle={
          query
            ? `${total} match${total === 1 ? '' : 'es'}`
            : `${total.toLocaleString()} registered`
        }
      >
        <HeaderStat label="With free washes" value={withCredits} icon="gift" />
        <HeaderStat label="Showing" value={`${clients.length}/${total}`} icon="list" />
      </ScreenHeader>

      <View style={styles.searchBar}>
        <SearchField value={query} onChangeText={handleSearch} placeholder="Name, phone, or member code" />
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
              message={query ? 'Try a different name, phone or code.' : 'Customers appear here once they register.'}
            />
          </Surface>
        ) : (
          <>
            <SectionHeader title={query ? 'Results' : 'All customers'} count={clients.length} />
            <Surface elevation="sm" padded="sm">
              {clients.map((c: any, i: number) => {
                const credits = Number(c.free_wash_credits || 0);
                return (
                  <ListRow
                    key={c.id}
                    onPress={() => openAdjust(c)}
                    leading={initials(c.full_name)}
                    leadingTone={credits > 0 ? 'accent' : 'neutral'}
                    title={c.full_name}
                    subtitle={c.phone}
                    meta={c.member_code}
                    last={i === clients.length - 1}
                    trailing={
                      <View style={styles.right}>
                        <Text style={styles.washes}>
                          <Text style={styles.washNum}>{Number(c.lifetime_washes || 0)}</Text> washes
                        </Text>
                        {credits > 0 ? (
                          <View style={styles.creditPill}>
                            <Icon name="gift" size={8} color={colors.accent} />
                            <Text style={styles.creditText}>
                              {credits} free
                            </Text>
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
        title="Adjust loyalty"
        subtitle={adjustTarget?.full_name}
        submitLabel="Apply adjustment"
        onSubmit={submitAdjust}
        submitting={adjusting}
      >
        {/* Current standing, so the admin adjusts from a known baseline */}
        {adjustTarget ? (
          <Surface elevation="none" tone={colors.bgSunken} borderless style={styles.current}>
            <View style={styles.currentItem}>
              <Text style={styles.currentValue}>{Number(adjustTarget.lifetime_washes || 0)}</Text>
              <Text style={styles.currentLabel}>LIFETIME WASHES</Text>
            </View>
            <View style={styles.currentDivider} />
            <View style={styles.currentItem}>
              <Text style={styles.currentValue}>{Number(adjustTarget.free_wash_credits || 0)}</Text>
              <Text style={styles.currentLabel}>FREE CREDITS</Text>
            </View>
          </Surface>
        ) : null}

        <Field
          label="Wash count change"
          value={washDelta}
          onChangeText={setWashDelta}
          keyboardType="numbers-and-punctuation"
          placeholder="e.g. 1 or -1"
          hint="Use a negative number to remove washes."
        />
        <Field
          label="Free credit change"
          value={creditDelta}
          onChangeText={setCreditDelta}
          keyboardType="numbers-and-punctuation"
          placeholder="e.g. 1 or -1"
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
  moreText: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.primary },
  endText: { fontSize: font.xs, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.sm },

  right: { alignItems: 'flex-end', gap: 4 },
  washes: { fontSize: font.xs, color: colors.textMuted },
  washNum: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text },
  creditPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accentSoft, borderRadius: radii.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  creditText: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.accent },

  current: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  currentItem: { flex: 1, alignItems: 'center', gap: 2 },
  currentDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  currentValue: { fontSize: font.xxl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },
  currentLabel: { fontSize: font.micro, fontWeight: weight.bold, color: colors.textMuted, letterSpacing: tracking.caps },
});
