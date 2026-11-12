import React, { useCallback, useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import AdminScreen from '../../components/admin/AdminScreen';
import BranchSheet, { BranchOption } from '../../components/admin/BranchSheet';
import { Card, Row, Chip, Chips, Btn, IconChip } from '../../components/admin/kit';
import BranchQrPoster from '../../components/BranchQrPoster';

type Branch = { id: string; name: string; code: string };

/**
 * Branch QR: the poster for a branch's wall, the one code a client scans to
 * book a wash there. The org admin picks any branch (and prints it); a
 * manager or worker sees their own branch's — for staff it doubles as the
 * code to show a customer whose camera can't find the poster.
 */
export default function BranchQrScreen() {
  const route = useRoute<any>();
  const { actor } = useAuth();
  const isOrgAdmin = actor?.role === 'orgadmin';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string | null>(route.params?.branchId || null);
  const [orgId, setOrgId] = useState<string | null>(actor?.org_id || null);
  const [picking, setPicking] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { if (route.params?.branchId) setBranchId(route.params.branchId); }, [route.params]);

  const load = useCallback(async () => {
    try {
      if (isOrgAdmin) {
        const list: any[] = await api.listBranches();
        const active = list.filter((b) => b.status !== 'inactive').map((b) => ({ id: b.id, name: b.name, code: b.code }));
        setBranches(active);
        setBranchId((cur) => cur || active[0]?.id || null);
      } else {
        // Staff: their own branch, read fresh so the code is always current.
        const me: any = await api.getMe();
        if (me?.org_id) setOrgId(me.org_id);
        if (me?.branch_id && me?.branch_code) {
          setBranches([{ id: me.branch_id, name: me.branch_name, code: me.branch_code }]);
          setBranchId(me.branch_id);
        }
      }
    } catch { /* shows the empty state */ }
    setLoaded(true);
  }, [isOrgAdmin]);

  useEffect(() => { load(); }, [load]);

  const branch = branches.find((b) => b.id === branchId) || null;

  return (
    <AdminScreen
      title="Branch QR"
      subtitle={branch ? `${branch.name} · scan to wash` : 'Scan to wash'}
      loading={!loaded}
      onRefresh={load}
      back={!!route.params?.branchId}
    >
      {isOrgAdmin && branches.length > 1 ? (
        <Chips>
          <Chip label={branch?.name || 'Pick a branch'} caret onPress={() => setPicking(true)} />
        </Chips>
      ) : null}

      {branch && orgId ? (
        <>
          <View nativeID="qr-poster">
            <BranchQrPoster orgId={orgId} branchCode={branch.code} branchName={branch.name} />
          </View>
          {Platform.OS === 'web' ? (
            <Btn primary icon="print" title="Print poster" onPress={printPoster} />
          ) : null}
        </>
      ) : (
        <Card flush>
          <Row
            leading={<IconChip icon="store" tone="primary" />}
            title={isOrgAdmin ? 'No branches yet' : 'No branch on your account'}
            sub={isOrgAdmin ? 'Add a branch in Branches and its QR appears here' : 'Ask your admin to assign you to a branch'}
            last
          />
        </Card>
      )}

      {isOrgAdmin ? (
        <BranchSheet
          visible={picking}
          onClose={() => setPicking(false)}
          branches={branches.map((b): BranchOption => ({ id: b.id, name: b.name }))}
          value={branchId}
          onPick={(id) => { if (id) setBranchId(id); }}
        />
      ) : null}
    </AdminScreen>
  );
}

/**
 * Web: print the poster alone — everything else on the page (and the phone
 * frame on a wide screen) is hidden for print, the poster is set full width.
 */
function printPoster() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('qr-print-style')) {
    const st = document.createElement('style');
    st.id = 'qr-print-style';
    st.textContent = `
@media print {
  html, body { background: #fff !important; overflow: visible !important; height: auto !important; }
  #phone-shell { display: none !important; }
  body > div { position: static !important; transform: none !important; width: auto !important; height: auto !important; overflow: visible !important; }
  body * { visibility: hidden !important; }
  #qr-poster, #qr-poster * { visibility: visible !important; }
  #qr-poster { position: fixed !important; left: 0; top: 0; right: 0; margin: 0 auto; max-width: 480px; }
}`;
    document.head.appendChild(st);
  }
  window.print();
}
