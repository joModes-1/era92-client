import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { api } from '../api';
import { useAuth } from '../api/AuthContext';
import { useAppAlert, AlertHost } from './AppAlert';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../theme';
import Icon from './Icon';

/**
 * The branch picker behind the home screen's top-left branch row.
 *
 * What it does: asks the device where it is (foreground permission only —
 * never "always"), asks the server for the org's active branches sorted by
 * distance, and hands the tapped branch back the same way the wall-QR scan
 * does. The sheet is a manual override: it never auto-navigates anywhere
 * and never pre-selects on the client's behalf.
 *
 * Two deliberate degradations, per NEARBY_BRANCH_LOCATION.md's own rule
 * that a client who could already scan a QR must never be newly blocked:
 *  - Permission declined / GPS off / no fix: the list still opens, sorted
 *    alphabetically with no distances, plus one line offering to enable
 *    location. No error state, no dead end.
 *  - Web: expo-location's geolocation works in browsers; the sheet uses
 *    only the foreground one-shot API, so it behaves the same here. (Real
 *    background geofencing is native-only and is a separate, later piece.)
 */

type NearbyBranch = {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  distance_km?: number;
};

export default function BranchPickerSheet({
  visible, onClose, onPicked,
}: {
  visible: boolean;
  onClose: () => void;
  /** Same hand-off BranchScanScreen performs: BookWash takes branchId + branchName. */
  onPicked: (branch: { id: string; name: string; code: string }) => void;
}) {
  const { actor } = useAuth();
  const alert = useAppAlert();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<NearbyBranch[] | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!visible || requestedRef.current) return;
    requestedRef.current = true;
    (async () => {
      if (!actor?.org_id) {
        alert('Could not verify your account', 'Please sign out and back in, then try again.');
        onClose();
        return;
      }
      setLoading(true);
      try {
        // Foreground one-shot fix only. If permission was already granted
        // this never prompts; if it was permanently denied this fails soft.
        const perm = await Location.requestForegroundPermissionsAsync();
        let lat: number | undefined;
        let lng: number | undefined;

        if (perm.granted) {
          try {
            const fix = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            lat = fix.coords.latitude;
            lng = fix.coords.longitude;
          } catch {
            // A fix can time out or be briefly unavailable — degrade, don't fail.
          }
        }

        if (lat === undefined || lng === undefined) {
          setLocationNote('Enable location to see which branch is closest.');
        }

        // With a fix: nearest-first within 25km. Without: all branches,
        // alphabetical, no distances (server decides; same endpoint).
        const rows: NearbyBranch[] = await api.nearbyBranches(
          actor.org_id,
          lat !== undefined && lng !== undefined ? lat : undefined,
          lat !== undefined && lng !== undefined ? lng : undefined,
        );
        setBranches(Array.isArray(rows) ? rows : []);
      } catch (e: any) {
        setBranches([]);
        alert('Could not load branches', e?.message || 'Please try again.');
      }
      setLoading(false);
    })();
  }, [visible, actor?.org_id, alert, onClose]);

  useEffect(() => {
    if (!visible) {
      // Reset so the next open re-requests a fresh fix — the client may
      // have moved since the last time the sheet was open.
      requestedRef.current = false;
      setBranches(null);
      setLocationNote(null);
    }
  }, [visible]);

  const pick = (b: NearbyBranch) => {
    onClose();
    onPicked({ id: b.id, name: b.name, code: b.code });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: spacing.xl + insets.bottom }]}>
          <View style={styles.grabber} />

          <View style={styles.head}>
            <Text style={styles.title}>Choose a branch</Text>
            <Text style={styles.sub}>
              The same list a wall-QR scan leads to — pick whichever branch you are at.
            </Text>
          </View>

          {locationNote ? (
            <View style={styles.note}>
              <Icon name="map-marker" size={12} color={colors.textMuted} />
              <Text style={styles.noteText}>{locationNote}</Text>
            </View>
          ) : null}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: spacing.sm }}
            showsVerticalScrollIndicator={false}
          >
            {loading || branches === null ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : branches.length === 0 ? (
              <View style={styles.empty}>
                <Icon name="map" size={20} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No branches nearby</Text>
                <Text style={styles.emptySub}>
                  Nothing within range right now. You can still scan the QR code on the wall at any branch.
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.scanFallbackBtn}
                  activeOpacity={0.8}
                >
                  <Icon name="qrcode" size={12} color="#fff" />
                  <Text style={styles.scanFallbackText}>Scan the wall QR instead</Text>
                </TouchableOpacity>
              </View>
            ) : (
              branches.map((b, i) => {
                const hasDistance = typeof b.distance_km === 'number';
                const distance = hasDistance
                  ? (b.distance_km as number) < 1
                    // Under a kilometre reads better in metres — "800 m away"
                    // says "you have arrived" in a way "0.8 km away" does not.
                    ? `${Math.round((b.distance_km as number) * 1000)} m away`
                    : `${b.distance_km} km away`
                  : null;
                return (
                  <TouchableOpacity
                    key={b.id || i}
                    onPress={() => pick(b)}
                    activeOpacity={0.7}
                    style={styles.row}
                  >
                    <View style={styles.rowIcon}>
                      <Icon name="map-marker" size={13} color={colors.primary} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName} numberOfLines={1}>{b.name}</Text>
                      {b.address ? (
                        <Text style={styles.rowSub} numberOfLines={1}>{b.address}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.rowDistance, !hasDistance && styles.rowCode]}>
                      {hasDistance ? distance : b.code}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>

      {/* Same Android rule as every other sheet in the app: an alert raised
          from inside a Modal must be hosted inside that Modal. */}
      <AlertHost />
    </Modal>
  );
}

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={[styles.rowIcon, { backgroundColor: colors.bgSunken }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '55%' }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11,14,28,0.55)',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: '80%',
    ...shadow.lg,
  },
  grabber: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg,
  },
  head: { marginBottom: spacing.md },
  title: {
    fontSize: font.xxl, fontWeight: weight.black,
    color: colors.text, letterSpacing: tracking.display,
  },
  sub: { fontSize: font.sm, color: colors.textMuted, marginTop: 2, lineHeight: 19 },

  note: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.bgSunken, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  noteText: { flex: 1, fontSize: font.xs, color: colors.textMuted, fontWeight: weight.medium },

  scroll: { flexGrow: 0 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radii.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 1 },
  rowName: { fontSize: font.sm, fontWeight: weight.bold, color: colors.text },
  rowSub: { fontSize: font.micro, color: colors.textMuted },
  rowDistance: { fontSize: font.xs, fontWeight: weight.heavy, color: colors.primary },
  rowCode: { color: colors.textMuted },

  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: 6 },
  emptyTitle: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text, marginTop: 4 },
  emptySub: {
    fontSize: font.xs, color: colors.textMuted, textAlign: 'center',
    lineHeight: 17, maxWidth: '86%',
  },
  scanFallbackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.primary, borderRadius: radii.full,
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    marginTop: spacing.md,
  },
  scanFallbackText: { fontSize: font.xs, fontWeight: weight.bold, color: '#fff' },

  skeletonRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md,
  },
  skeletonLine: {
    height: 11, borderRadius: 6, width: '78%',
    backgroundColor: colors.bgSunken,
  },
});
