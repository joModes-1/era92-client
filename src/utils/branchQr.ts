/**
 * What a branch's wall QR holds, and how a client's scan reads it back.
 *
 * The QR carries the organisation AND the branch code: a code like "NTD" is
 * only unique within one organisation (server: branches/clientBranchRoutes
 * /resolve). It is written as a link to the web app, so a phone's own camera
 * app opens 92 CarWash rather than showing raw text.
 *
 * Reading stays lenient: a bare code ("NTD", typed or from an older printed
 * QR) still works, scoped to the client's own organisation as before.
 */
const SCAN_BASE = 'https://carwash.villacode.site/scan';

export function branchQrValue(orgId: string, branchCode: string): string {
  return `${SCAN_BASE}?org=${encodeURIComponent(orgId)}&branch=${encodeURIComponent(branchCode)}`;
}

export function parseBranchQr(raw: string): { code: string; orgId?: string } {
  const text = String(raw || '').trim();
  const m = /[?&]branch=([^&#]+)/i.exec(text);
  if (m) {
    const org = /[?&]org=([^&#]+)/i.exec(text);
    return { code: decodeURIComponent(m[1]), orgId: org ? decodeURIComponent(org[1]) : undefined };
  }
  return { code: text };
}
