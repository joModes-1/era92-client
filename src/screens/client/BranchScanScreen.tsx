import React, { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { useAppAlert } from '../../components/AppAlert';
import ScannerSheet from '../../components/ScannerSheet';

/**
 * The client's only scan in the whole self-service flow: the static QR
 * printed on the wall at a branch. Everything before this redesign had the
 * client SHOWING a QR for a worker to scan; this inverts that completely —
 * the client now scans, and never shows a code to start a wash again.
 *
 * Thin wrapper around the same ScannerSheet a worker uses — it already
 * renders full-screen with its own dark chrome, so this screen has nothing
 * to add beyond resolving what gets scanned.
 */
// Branch used when booking from a browser (no camera). Override per
// environment with EXPO_PUBLIC_WEB_BRANCH_CODE.
const WEB_BRANCH_CODE = process.env.EXPO_PUBLIC_WEB_BRANCH_CODE || 'NTD';

export default function BranchScanScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { actor } = useAuth();
  const alert = useAppAlert();
  const [busy, setBusy] = useState(false);

  // Threaded through from LoyaltyScreen's "Redeem" button (useFreeWash) and
  // from the home screen's promo card (usePromo when grabbing, usePromoFree
  // when the offer is armed and this next booking is the free one) — carries
  // all the way to BookWashScreen so the eventual booking carries the right
  // flag. preselectServiceName comes from tapping a service tile on the
  // home screen directly, rather than the generic "Scan to wash" bar.
  const { useFreeWash, usePromo, usePromoFree, preselectServiceName, payWithPoints } = route.params || {};

  const resolveBranch = async (code: string) => {
    if (!actor?.org_id) {
      alert('Could not verify your account', 'Please sign out and back in, then try again.');
      return;
    }
    setBusy(true);
    try {
      const branch = await api.resolveBranchCode(code, actor.org_id);
      navigation.replace('BookWash', {
        branchId: branch.id,
        branchName: branch.name,
        useFreeWash: useFreeWash && !usePromo && !usePromoFree,
        usePromo,
        usePromoFree,
        preselectServiceName,
        payWithPoints,
      });
    } catch (e: any) {
      alert('Code not recognised', e.message || 'That QR or code was not recognised. Ask staff for the branch code.');
    }
    setBusy(false);
  };

  return (
    <ScannerSheet
      visible
      onClose={() => navigation.goBack()}
      busy={busy}
      title="Scan QR Code"
      // A PC has no camera to scan the wall QR: "Enter car details" just
      // continues with a default branch. Phones keep the real scan flow.
      onWebContinue={() => resolveBranch(WEB_BRANCH_CODE)}
      hint="Point your camera at the QR code on the wall at this branch."
      manualLabel="Branch code"
      manualPlaceholder="e.g. NTD"
      onScanned={(value) => resolveBranch(value)}
    />
  );
}
