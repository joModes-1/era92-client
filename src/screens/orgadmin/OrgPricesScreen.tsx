import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader, { HeaderAction } from '../../components/ScreenHeader';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, SectionHeader, EmptyState, SkeletonList, Field, FormSheet } from '../../components/ui';

// The grid is sized to the screen rather than to fixed columns. Five car
// types at 96px plus a 116px label ran to ~600px on a ~360px phone, so the
// table always scrolled sideways and a whole row was never visible at once.
// Two changes together make it fit: columns divide whatever width is left
// after the label, and cells show "25k" rather than "25,000" — a six-digit
// figure needs ~58px, and five of those cannot fit any phone. Rounded
// thousands are how these prices are read at a glance anyway, and the exact
// figure is one tap away in the editor. Past the legibility floor the grid
// still scrolls, but only when it genuinely carries more columns than a
// phone can show.
const MIN_COL_W = 48;
const MAX_COL_W = 104;  // stop columns ballooning when there are only two
const LABEL_MIN = 74;
const LABEL_MAX = 104;
const LABEL_SHARE = 0.26;
const CARD_PAD = 2;     // hairline borders on the card edges

/**
 * "25,000" -> "25k", "7,500" -> "7.5k", "1,250" -> "1,250".
 *
 * Only shortens when the result is exact. A price that would need rounding
 * is printed in full instead — showing 1,250 as "1.3k" states a number the
 * customer is not being charged, and a price the owner cannot trust at a
 * glance is worse than one that makes its column scroll.
 */
function shortPrice(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  if (Number.isInteger(k)) return `${k}k`;
  // One decimal, but only where it loses nothing (7,500 -> 7.5k).
  if (Math.round(k * 10) === k * 10) return `${k}k`;
  return n.toLocaleString();
}

/** What the "add" sheet is currently creating. Both roles can add; the
 * difference is scope — an org admin's new type is org-wide, a manager's is
 * private to their own branch (the server stamps it from their token). */
type AddKind = 'vehicle' | 'service' | null;

export default function OrgPricesScreen() {
  const alert = useAppAlert();
  const { actor } = useAuth();
  // A manager manages their own branch: types they add are private to it,
  // and a price they set lands either on their own private type (an org-scope
  // row, since nobody else can see that type anyway) or as a branch override
  // on a shared org-wide type. The server enforces all of this from the token
  // regardless of what the client sends — see modules/catalogue/scope.ts.
  const isManager = actor?.role === 'manager';
  const branchId: string | undefined = actor?.branch_id;
  const branchName: string | undefined = actor?.branch_name;

  const [matrixData, setMatrixData] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [editCell, setEditCell] = useState<{
    service_id: string; vehicle_class_id: string; service_name: string; vc_name: string;
    price?: number;
    /** Both sides of the combo belong to this manager's own branch. */
    ownBranchType?: boolean;
  } | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Adding a car type or wash type from here, rather than bouncing out to
  // the Catalogue and back — a price row/column has to exist before it can be
  // priced, so creating one belongs on this screen.
  const [addKind, setAddKind] = useState<AddKind>(null);
  const [addName, setAddName] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [adding, setAdding] = useState(false);

  // Measured from the card itself rather than Dimensions.get(), so the grid
  // is correct inside whatever padding the screen happens to use and follows
  // a rotation without a reload.
  const [gridWidth, setGridWidth] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api.getPriceMatrix(isManager ? branchId : undefined);
      setMatrixData(data);
    } catch {}
  }, [isManager, branchId]);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Derived above every handler and the loading branch, so the add/price
  // callbacks can read them without a use-before-declaration hazard.
  const services = matrixData?.services || [];
  const vehicleClasses = matrixData?.vehicle_classes || [];
  const missing = matrixData?.missing || [];

  const findPrice = (serviceId: string, vcId: string) =>
    matrixData?.matrix?.find((m: any) => m.service_id === serviceId && m.vehicle_class_id === vcId);

  const openEdit = (service: any, vc: any) => {
    const existing = findPrice(service.id, vc.id);
    // A manager edits their branch's effective price (their own override if
    // one exists, else the org default they're about to override); an org
    // admin edits the org default itself.
    const currentPrice = isManager
      ? existing?.effective_price_ugx ?? existing?.org_price_ugx
      : existing?.org_price_ugx;
    setEditCell({
      service_id: service.id,
      vehicle_class_id: vc.id,
      service_name: service.name,
      vc_name: vc.name,
      price: currentPrice,
      ownBranchType: !!branchId && service.branch_id === branchId && vc.branch_id === branchId,
    });
    setPriceInput(currentPrice != null ? String(currentPrice) : '');
  };

  const submitPrice = async () => {
    if (!editCell) return;
    const price = parseInt(priceInput, 10);
    if (isNaN(price) || price < 0) {
      alert('Invalid price', 'Enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        service_id: editCell.service_id,
        vehicle_class_id: editCell.vehicle_class_id,
        price_ugx: price,
      };
      // Which write a manager makes depends on whose type it is. For a type
      // private to their own branch there is no org-wide price to override —
      // the org-scope row IS the branch's price, and the server allows it
      // precisely because no other branch can see that type. For a shared
      // org-wide type they must write a branch override instead, so one
      // branch never reprices the whole organisation.
      if (isManager && branchId && !editCell.ownBranchType) {
        await api.setBranchPrice(branchId, body);
      } else {
        await api.setOrgPrice(body);
      }
      setEditCell(null);
      await load();
    } catch (e: any) {
      alert('Error', e.message);
    }
    setSaving(false);
  };

  const openAdd = (kind: Exclude<AddKind, null>) => {
    setAddKind(kind);
    setAddName('');
    setAddPrice('');
  };

  /**
   * Create the car type or wash type, then — if a starting price was given —
   * apply it across the whole new row or column in one go. Adding an "SUV"
   * with no prices anywhere is a half-finished job; this finishes it.
   */
  const submitAdd = async () => {
    const name = addName.trim();
    if (!name) {
      alert('Name needed', addKind === 'vehicle' ? 'What is this car type called?' : 'What is this wash type called?');
      return;
    }
    const priceGiven = addPrice.trim() !== '';
    const price = parseInt(addPrice, 10);
    if (priceGiven && (isNaN(price) || price < 0)) {
      alert('Invalid price', 'Enter a valid amount, or leave it blank to price each cell yourself.');
      return;
    }

    setAdding(true);
    try {
      let newId: string;
      if (addKind === 'vehicle') {
        const created = await api.createVehicleClass({ name, sort_order: vehicleClasses.length });
        newId = created?.id;
      } else {
        const created = await api.createService({ name });
        newId = created?.id;
      }

      if (priceGiven && newId) {
        // The counterpart axis: a new car type needs a price against every
        // wash type, and vice versa.
        const others = addKind === 'vehicle' ? services : vehicleClasses;
        const combo = (o: any) =>
          addKind === 'vehicle'
            ? { service_id: o.id, vehicle_class_id: newId, price_ugx: price }
            : { service_id: newId, vehicle_class_id: o.id, price_ugx: price };

        if (isManager && branchId) {
          // A manager's new type is branch-private, but the types it pairs
          // with are a mix: their own (org-scope price is fine — nobody else
          // can see either side) and shared org-wide ones (must be a branch
          // override, or one branch would be repricing the whole org).
          // Sending the lot through /prices/bulk fails the entire batch on
          // the shared rows, which left the new column with no prices at all
          // and an error that did not explain why.
          const ownScope = others.filter((o: any) => o.branch_id === branchId).map(combo);
          const sharedScope = others.filter((o: any) => o.branch_id === null).map(combo);

          if (ownScope.length > 0) await api.bulkSetPrices(ownScope);
          // No bulk equivalent exists for branch overrides, so these go one
          // at a time. The counts here are small (one row/column of a grid
          // that has to fit on a phone), so this stays well-bounded.
          for (const row of sharedScope) {
            await api.setBranchPrice(branchId, row);
          }
        } else {
          const prices = others.map(combo);
          if (prices.length > 0) await api.bulkSetPrices(prices);
        }
      }

      setAddKind(null);
      await load();

      const label = addKind === 'vehicle' ? 'Car type' : 'Wash type';
      const where = isManager ? ` at ${branchName || 'your branch'}` : '';
      alert(
        `${label} added`,
        priceGiven
          ? `${name} is priced at ${price.toLocaleString()} UGX across the board${where}. Tap any cell to change an individual price.`
          : `${name} has been added${where}. Tap its cells to set prices.`
      );
    } catch (e: any) {
      alert('Error', e.message);
    }
    setAdding(false);
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Prices" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={5} /></ScrollView>
      </View>
    );
  }

  // Give the label column a share that scales with how many price columns
  // have to fit beside it, then split the remainder evenly.
  const colCount = vehicleClasses.length || 1;
  const labelW = Math.max(LABEL_MIN, Math.min(LABEL_MAX, (gridWidth || 320) * (colCount <= 2 ? 0.38 : LABEL_SHARE)));
  const rawCol = (gridWidth - labelW - CARD_PAD) / colCount;
  const colW = Math.max(MIN_COL_W, Math.min(MAX_COL_W, rawCol));
  // Everything fits only when the honest column width was not clamped up to
  // the floor; below that we scroll rather than render unreadable columns.
  const fits = gridWidth > 0 && rawCol >= MIN_COL_W;

  const totalCells = services.length * vehicleClasses.length;
  const filled = totalCells - missing.length;
  const empty = services.length === 0 || vehicleClasses.length === 0;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Prices"
        subtitle={
          isManager
            ? `${branchName || 'Your branch'} · ${services.length} wash types × ${vehicleClasses.length} car types`
            : `${services.length} wash types × ${vehicleClasses.length} car types`
        }
        action={<HeaderAction icon="plus" onPress={() => openAdd(vehicleClasses.length === 0 ? 'vehicle' : 'service')} />}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Add buttons come first and are always present — adding a car type
            or a wash type IS how you add a price, so it must not be hidden
            behind an empty state or a trip to another screen. Org admin only:
            a manager overriding one branch's prices has no reason to invent
            a car/wash type that every other branch would also see. */}
        <View style={styles.addRow}>
          <TouchableOpacity style={styles.addBtn} onPress={() => openAdd('vehicle')} activeOpacity={0.8}>
            <Icon name="car" size={12} color={colors.primary} />
            <Text style={styles.addBtnText}>Add car type</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => openAdd('service')} activeOpacity={0.8}>
            <Icon name="th-large" size={12} color={colors.primary} />
            <Text style={styles.addBtnText}>Add wash type</Text>
          </TouchableOpacity>
        </View>

        {isManager && (
          <View style={styles.explain}>
            <Icon name="info-circle" size={11} color={colors.textMuted} />
            <Text style={styles.explainText}>
              Anything you add here belongs to {branchName || 'your branch'} only. Shared org-wide types can be re-priced for your branch but not renamed.
            </Text>
          </View>
        )}

        {empty ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState
              icon="tags"
              title={
                vehicleClasses.length === 0 && services.length === 0
                  ? 'No prices yet'
                  : vehicleClasses.length === 0
                  ? 'No car types yet'
                  : 'No wash types yet'
              }
              message={
                isManager
                  ? 'Add the car types and wash types your branch offers — they stay private to your branch.'
                  : vehicleClasses.length === 0 && services.length === 0
                  ? 'A price is one car type getting one wash type. Add a car type (Saloon, SUV) and a wash type (Body wash, Full valet) and every combination appears here ready to price.'
                  : vehicleClasses.length === 0
                  ? 'You have wash types but no car types. Add a car type and the grid fills in.'
                  : 'You have car types but no wash types. Add a wash type and the grid fills in.'
              }
            />
          </Surface>
        ) : (
          <>
            {/* Coverage banner */}
            <Surface
              elevation="sm"
              tone={missing.length > 0 ? colors.warningSoft : colors.successSoft}
              borderless
              style={styles.banner}
            >
              <Icon
                name={missing.length > 0 ? 'exclamation-triangle' : 'check-circle'}
                size={13}
                color={missing.length > 0 ? colors.warning : colors.success}
              />
              <Text style={[styles.bannerText, { color: missing.length > 0 ? colors.warning : colors.success }]}>
                {missing.length > 0
                  ? isManager
                    ? `${missing.length} of ${totalCells} combinations have no org price yet`
                    : `${missing.length} of ${totalCells} combinations still need a price`
                  : `All ${totalCells} combinations priced`}
              </Text>
              <Text style={styles.bannerCount}>{filled}/{totalCells}</Text>
            </Surface>

            <SectionHeader title="Price matrix" icon="table" />

            {/* Matrix — horizontal scroll with a pinned service column */}
            {/* The measuring View sits inside the card so the width it
                reports is the space the grid actually gets. */}
            <Surface elevation="sm" padded={false} style={styles.matrixCard}>
              <View onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
              <MaybeScroll scroll={!fits}>
                <View style={fits ? styles.gridFit : undefined}>
                  {/* Header */}
                  <View style={styles.row}>
                    <View style={[styles.corner, { width: labelW }]}>
                      <Text style={styles.cornerText}>UGX</Text>
                    </View>
                    {vehicleClasses.map((vc: any) => (
                      <View key={vc.id} style={[styles.headCell, { width: colW }]}>
                        <Text style={styles.headText} numberOfLines={2}>{vc.name}</Text>
                      </View>
                    ))}
                    {/* Adding a column is an action that belongs in the header */}
                    {!fits && (
                      <TouchableOpacity
                        style={[styles.addCell, { width: 52 }]}
                        onPress={() => openAdd('vehicle')}
                        activeOpacity={0.6}
                      >
                        <Icon name="plus" size={11} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Body */}
                  {services.map((svc: any, r: number) => (
                    <View key={svc.id} style={[styles.row, styles.rowBorder]}>
                      <View style={[styles.labelCell, { width: labelW }]}>
                        <Text style={styles.labelText} numberOfLines={2}>{svc.name}</Text>
                      </View>

                      {vehicleClasses.map((vc: any) => {
                        const p = findPrice(svc.id, vc.id);
                        const displayPrice = isManager ? p?.effective_price_ugx ?? p?.org_price_ugx : p?.org_price_ugx;
                        const has = displayPrice != null;
                        const isOverride = isManager && p?.source === 'branch_override';
                        return (
                          <TouchableOpacity
                            key={vc.id}
                            style={[styles.cell, { width: colW }, !has && styles.cellEmpty]}
                            onPress={() => openEdit(svc, vc)}
                            activeOpacity={0.6}
                          >
                            {has ? (
                              <View style={styles.cellValueWrap}>
                                <Text style={styles.cellText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                                  {shortPrice(Number(displayPrice))}
                                </Text>
                                {/* A dot marks a branch-specific price so a
                                    manager can tell "mine" from "org default"
                                    at a glance, without opening the cell. */}
                                {isOverride && <View style={styles.overrideDot} />}
                              </View>
                            ) : (
                              <Icon name="plus" size={11} color={colors.warning} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                      {!fits && <View style={{ width: 52 }} />}
                    </View>
                  ))}

                  {/* Adding a row, in the row position */}
                  <TouchableOpacity
                    style={[styles.row, styles.addRowStrip]}
                    onPress={() => openAdd('service')}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.addRowInner, { width: labelW }]}>
                      <Icon name="plus" size={10} color={colors.primary} />
                      <Text style={styles.addRowText}>Wash type</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </MaybeScroll>
              </View>
            </Surface>

            <View style={styles.hint}>
              <Icon name="info-circle" size={11} color={colors.textMuted} />
              <Text style={styles.hintText}>
                {isManager
                  ? 'A dot marks a price set for your branch. Cells without one use the org default. Types you add are private to your branch.'
                  : 'Prices in thousands — tap any cell for the exact figure. Branch managers can override the org price for their own branch.'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Set one price ── */}
      <FormSheet
        visible={!!editCell}
        onClose={() => setEditCell(null)}
        title={isManager ? 'Set branch price' : 'Set price'}
        subtitle={editCell ? `${editCell.service_name} · ${editCell.vc_name}` : undefined}
        submitLabel="Save price"
        onSubmit={submitPrice}
        submitting={saving}
      >
        <Field
          label="Price"
          required
          prefix="UGX"
          value={priceInput}
          onChangeText={setPriceInput}
          placeholder="25000"
          keyboardType="numeric"
          autoFocus
          hint={
            editCell?.price != null
              ? `Currently ${Number(editCell.price).toLocaleString()}${isManager ? ` for ${branchName || 'your branch'}` : ''}`
              : isManager
              ? 'No branch price set — using the org default.'
              : 'No price set yet.'
          }
          style={{ marginBottom: 0 }}
        />
      </FormSheet>

      {/* ── Add a car type / wash type, and optionally price it at once ──
          Org admin only; managers never open this sheet. */}
      <FormSheet
        visible={addKind !== null}
        onClose={() => setAddKind(null)}
        title={addKind === 'vehicle' ? 'Add car type' : 'Add wash type'}
        subtitle={
          isManager
            ? `${addKind === 'vehicle' ? 'A new column' : 'A new row'} — ${branchName || 'your branch'} only`
            : addKind === 'vehicle'
            ? 'A new column in the price grid'
            : 'A new row in the price grid'
        }
        submitLabel="Add"
        onSubmit={submitAdd}
        submitting={adding}
      >
        <Field
          label="Name"
          required
          value={addName}
          onChangeText={setAddName}
          placeholder={addKind === 'vehicle' ? 'e.g. SUV' : 'e.g. Full valet'}
          autoFocus
        />
        <Field
          label="Starting price"
          prefix="UGX"
          value={addPrice}
          onChangeText={setAddPrice}
          placeholder="25000"
          keyboardType="numeric"
          hint={
            addKind === 'vehicle'
              ? services.length > 0
                ? `Optional. Applies to all ${services.length} wash type${services.length === 1 ? '' : 's'} — change any of them afterwards.`
                : 'Add a wash type next, then prices can be set.'
              : vehicleClasses.length > 0
              ? `Optional. Applies to all ${vehicleClasses.length} car type${vehicleClasses.length === 1 ? '' : 's'} — change any of them afterwards.`
              : 'Add a car type next, then prices can be set.'
          }
          style={{ marginBottom: 0 }}
        />
      </FormSheet>
    </View>
  );
}

/**
 * Wraps the grid in a horizontal ScrollView only when it genuinely overflows.
 * A ScrollView that never scrolls still swallows horizontal drags, which on a
 * drawer-navigated screen competes with the edge-swipe gesture.
 */
function MaybeScroll({ scroll, children }: { scroll: boolean; children: React.ReactNode }) {
  if (!scroll) return <>{children}</>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },

  addRow: { flexDirection: 'row', gap: spacing.sm },
  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    minHeight: 44, borderRadius: radii.md, backgroundColor: colors.primarySoft,
  },
  addBtnText: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.primary },

  explain: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: spacing.xs },
  explainText: { flex: 1, fontSize: font.xs, color: colors.textMuted, lineHeight: 17 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bannerText: { flex: 1, fontSize: font.sm, fontWeight: weight.bold },
  bannerCount: { fontSize: font.sm, fontWeight: weight.black, color: colors.textSecondary },

  matrixCard: { overflow: 'hidden' },
  row: { flexDirection: 'row' },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },

  corner: {
    height: 40, justifyContent: 'center', paddingHorizontal: spacing.sm,
    backgroundColor: colors.bgSunken,
  },
  cornerText: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.caps },
  headCell: {
    height: 40, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, backgroundColor: colors.bgSunken,
    borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border,
  },
  headText: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.text, textAlign: 'center' },
  addCell: {
    height: 42, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border,
  },

  labelCell: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm, backgroundColor: colors.bgCard },
  labelText: { fontSize: font.xs, fontWeight: weight.bold, color: colors.text },

  gridFit: { width: '100%' },
  cell: {
    minHeight: 48, alignItems: 'center', justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.borderLight,
    paddingHorizontal: 4,
  },
  cellEmpty: { backgroundColor: colors.warningSoft },
  cellValueWrap: { alignItems: 'center', gap: 2 },
  cellText: { fontSize: font.xs, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  overrideDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  setWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  setText: { fontSize: font.micro, fontWeight: weight.bold, color: colors.warning },

  addRowStrip: { backgroundColor: colors.primarySoft },
  addRowInner: {
    minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md,
  },
  addRowText: { fontSize: font.xs, fontWeight: weight.heavy, color: colors.primary },

  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: spacing.xs },
  hintText: { flex: 1, fontSize: font.xs, color: colors.textMuted, lineHeight: 17 },
});
