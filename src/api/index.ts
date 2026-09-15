import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 3456;

/**
 * Work out where the API lives.
 *
 * On a phone, "localhost" is the phone itself — not this dev machine — so the
 * bundle's own host is the only reliable pointer back to the laptop. Expo
 * exposes that as `hostUri` ("192.168.1.3:8090"), and the API is the same
 * machine on a different port. On web we just reuse the browser's hostname.
 *
 * Set EXPO_PUBLIC_API_URL to override completely (e.g. a staging server).
 */
function resolveApiBase(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override.replace(/\/+$/, '');

  if (Platform.OS === 'web') {
    // Browser: same host that served the page, API port.
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:${API_PORT}/api/v1`;
    }
    return `http://localhost:${API_PORT}/api/v1`;
  }

  // Device / emulator: derive from the Metro host.
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    '';
  const host = hostUri.split(':')[0];
  if (host) return `http://${host}:${API_PORT}/api/v1`;

  // Standalone build with no dev server — must be configured explicitly.
  return `http://localhost:${API_PORT}/api/v1`;
}

const BASE = resolveApiBase();

// Printed once at startup so a failing device can be diagnosed instantly.
console.log(`[api] base URL: ${BASE}`);

let accessToken: string | null = null;
let refreshToken: string | null = null;

export async function loadTokens() {
  accessToken = await AsyncStorage.getItem('access_token');
  refreshToken = await AsyncStorage.getItem('refresh_token');
}

export async function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  await AsyncStorage.setItem('access_token', access);
  await AsyncStorage.setItem('refresh_token', refresh);
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('refresh_token');
  await AsyncStorage.removeItem('actor');
}

export async function getActor(): Promise<any | null> {
  const raw = await AsyncStorage.getItem('actor');
  return raw ? JSON.parse(raw) : null;
}

export async function setActor(actor: any) {
  await AsyncStorage.setItem('actor', JSON.stringify(actor));
}

// Called when the refresh token itself is no longer usable — the app must
// drop back to the login screen. Registered by AuthContext on mount so any
// request, anywhere, can trigger a clean logout instead of a dead error screen.
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

function isTokenExpiredError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes('token has expired') ||
    msg.includes('token expired') ||
    msg.includes('invalid or expired') ||
    msg.includes('jwt expired') ||
    msg.includes('invalid access token') ||
    msg.includes('missing or invalid authorization')
  );
}

// Refreshing is a single in-flight promise so concurrent 401s from several
// requests firing at once all await the same refresh instead of racing to
// rotate the refresh token multiple times (the backend revokes it on use).
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/platform/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const data = await res.json();
        if (!data.ok) return false;
        await setTokens(data.data.access_token, data.data.refresh_token);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/**
 * A network failure never reaches the server, so there is no envelope to
 * read — fetch() itself throws, with a message written for a developer, not
 * whoever is staring at the login screen: "UnknownHostException: Unable to
 * resolve host ... No address associated with hostname" for dead DNS, or
 * "Network request failed" for no connection at all. This turns either into
 * one plain sentence a user can act on. `err.code` matches the shape callers
 * already read off a real server error (e.g. isTokenExpiredError elsewhere
 * checks e.message, not e.code, so this stays consistent with that).
 */
function isNetworkError(e: any): boolean {
  const msg = String(e?.message || e || '').toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('unknownhostexception') ||
    msg.includes('no address associated with hostname') ||
    msg.includes('failed to connect') ||
    msg.includes('unable to resolve host') ||
    msg.includes('connection refused') ||
    msg.includes('timed out') ||
    msg.includes('fetch failed')
  );
}

async function rawReq(method: string, path: string, body?: any): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e: any) {
    if (isNetworkError(e)) {
      const err = new Error('No internet connection.') as Error & { code?: string };
      err.code = 'NETWORK_ERROR';
      throw err;
    }
    throw e;
  }

  const data = await res.json();
  if (!data.ok) {
    // Carry the machine-readable parts of the error, not just its prose.
    // Callers were reduced to regex-matching the message to tell one failure
    // from another, and any structured detail the server sent — the name of
    // the worker who started a job, for instance — was thrown away here.
    const err = new Error(data.error?.message || 'Request failed') as Error & {
      code?: string;
      details?: any;
      status?: number;
    };
    err.code = data.error?.code;
    err.details = data.error?.details;
    err.status = res.status;
    throw err;
  }
  return data.data;
}

async function req(method: string, path: string, body?: any): Promise<any> {
  try {
    return await rawReq(method, path, body);
  } catch (e: any) {
    // An expired/invalid access token gets one silent refresh-and-retry.
    // Never do this for the refresh call itself, or we'd loop forever.
    if (path !== '/auth/platform/refresh' && isTokenExpiredError(e?.message || '')) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return rawReq(method, path, body);
      }
      // Refresh token is also dead — this session is genuinely over.
      await clearTokens();
      onSessionExpired?.();
      throw new Error('Your session has expired. Please sign in again.');
    }
    throw e;
  }
}

export const api = {
  // Auth
  loginStaff: (username: string, password: string) =>
    req('POST', '/auth/staff/login', { username, password }),

  // Platform admins sign in with a username like every other role. The backend
  // matches on username OR email, so either identifier works here.
  loginPlatform: (username: string, password: string) =>
    req('POST', '/auth/platform/login', { username, password }),

  loginClient: (username: string, password: string) =>
    req('POST', '/auth/client/login', { username, password }),

  registerClient: (full_name: string, username: string, email: string, password: string) =>
    req('POST', '/auth/client/register', { full_name, username, email, password }),

  verifyClientEmail: (email: string, code: string) =>
    req('POST', '/auth/client/verify-email', { email, code }),

  requestClientPasswordReset: (email: string) =>
    req('POST', '/auth/client/request-password-reset', { email }),

  resetClientPassword: (email: string, code: string, new_password: string) =>
    req('POST', '/auth/client/reset-password', { email, code, new_password }),

  changePassword: (current: string, pwd: string) =>
    req('POST', '/auth/staff/change-password', { current_password: current, new_password: pwd }),

  changePasswordPlatform: (current: string, pwd: string) =>
    req('POST', '/auth/platform/change-password', { current_password: current, new_password: pwd }),

  changePasswordClient: (current: string, pwd: string) =>
    req('POST', '/auth/client/change-password', { current_password: current, new_password: pwd }),

  registerDevice: (push_token: string, platform: 'ios' | 'android') =>
    req('POST', '/me/device', { push_token, platform }),

  // Unified logout endpoint — works for staff/platform/client alike since it
  // revokes whichever refresh token is passed in, keyed off the JWT payload
  // rather than the caller's role.
  logout: () => req('POST', '/auth/platform/logout', { refresh_token: refreshToken }).catch(() => {}),

  // Me
  getMe: () => req('GET', '/me'),
  updateMe: (data: { full_name?: string; email?: string; phone?: string }) => req('PATCH', '/me', data),

  // Staff
  listStaff: () => req('GET', '/staff'),
  createStaff: (data: { full_name: string; username: string; email?: string; phone?: string; role: 'orgadmin' | 'manager' | 'worker'; branch_id?: string }) =>
    req('POST', '/staff', data),
  resetStaffPassword: (id: string) => req('POST', `/staff/${id}/reset-password`, {}),
  suspendStaff: (id: string) => req('POST', `/staff/${id}/suspend`),
  activateStaff: (id: string) => req('POST', `/staff/${id}/activate`),

  // Branches
  listBranches: () => req('GET', '/branches'),
  createBranch: (data: { name: string; code: string; address?: string; phone?: string; ready_alert_minutes?: number }) =>
    req('POST', '/branches', data),
  getBranch: (id: string) => req('GET', `/branches/${id}`),
  updateBranch: (id: string, data: { name?: string; address?: string; phone?: string; ready_alert_minutes?: number }) =>
    req('PATCH', `/branches/${id}`, data),

  // Catalogue
  //
  // Car types and wash types are either org-wide (branch_id null) or private
  // to one branch. The server decides scope from the caller's role — a
  // manager always gets their own branch and can only write there — so
  // branch_id here is an org-admin convenience, not a security boundary.
  listVehicleClasses: (branchId?: string) =>
    req('GET', `/vehicle-classes${branchId ? '?branch_id=' + branchId : ''}`),
  createVehicleClass: (data: { name: string; sort_order?: number; branch_id?: string | null }) =>
    req('POST', '/vehicle-classes', data),
  updateVehicleClass: (id: string, data: { name?: string; sort_order?: number; active?: boolean }) =>
    req('PATCH', `/vehicle-classes/${id}`, data),
  listServices: (branchId?: string) =>
    req('GET', `/services${branchId ? '?branch_id=' + branchId : ''}`),
  createService: (data: { name: string; description?: string; is_default?: boolean; earns_point?: boolean; branch_id?: string | null }) =>
    req('POST', '/services', data),
  updateService: (id: string, data: { name?: string; description?: string; is_default?: boolean; earns_point?: boolean; active?: boolean }) =>
    req('PATCH', `/services/${id}`, data),

  // Prices
  getEffectivePrices: (branchId: string) => req('GET', `/prices/effective?branch_id=${branchId}`),
  getPriceMatrix: (branchId?: string) => req('GET', `/prices${branchId ? '?branch_id=' + branchId : ''}`),
  setOrgPrice: (data: { service_id: string; vehicle_class_id: string; price_ugx: number }) =>
    req('PUT', '/prices', data),
  // Managers write here instead of setOrgPrice — the backend enforces a
  // manager can only target their own branch_id, so a manager's price change
  // never reaches other branches.
  setBranchPrice: (branchId: string, data: { service_id: string; vehicle_class_id: string; price_ugx: number }) =>
    req('PUT', `/prices/branch/${branchId}`, data),
  deleteBranchPrice: (branchId: string, priceId: string) =>
    req('DELETE', `/prices/branch/${branchId}/${priceId}`),
  bulkSetPrices: (prices: Array<{ service_id: string; vehicle_class_id: string; branch_id?: string; price_ugx: number }>) =>
    req('POST', '/prices/bulk', { prices }),
  getPriceHistory: (serviceId?: string, vehicleClassId?: string) => {
    const params = new URLSearchParams();
    if (serviceId) params.set('service_id', serviceId);
    if (vehicleClassId) params.set('vehicle_class_id', vehicleClassId);
    const qs = params.toString();
    return req('GET', `/prices/history${qs ? '?' + qs : ''}`);
  },

  // Loyalty config
  getLoyaltyConfig: () => req('GET', '/loyalty-config'),
  updateLoyaltyConfig: (data: { washes_required: number; min_amount_ugx: number; credit_expiry_days?: number | null }) =>
    req('PUT', '/loyalty-config', data),

  // Clients (orgadmin directory)
  searchClients: (q?: string, limit = 25, offset = 0) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (q) params.set('q', q);
    return req('GET', `/clients?${params.toString()}`);
  },
  adjustClientLoyalty: (clientId: string, data: { wash_delta: number; credit_delta: number; reason: string }) =>
    req('POST', `/clients/${clientId}/loyalty/adjust`, data),

  // Audit log
  getAuditLogs: (params?: { action?: string; from?: string; to?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.action) qs.set('action', params.action);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const s = qs.toString();
    return req('GET', `/audit-logs${s ? '?' + s : ''}`);
  },

  // Shifts
  openShift: () => req('POST', '/shifts/open'),
  getCurrentShift: () => req('GET', '/shifts/current'),
  requestCloseShift: (id: string) => req('POST', `/shifts/${id}/request-close`),
  // Clears a stranded pending_close day so the worker can keep working.
  reopenShift: (id: string) => req('POST', `/shifts/${id}/reopen`),
  closeShift: (id: string, counted: number, notes?: string) =>
    req('POST', `/shifts/${id}/close`, { counted_cash_ugx: counted, notes }),

  // Manager/orgadmin: every worker's day, for tracking cash handovers.
  listShifts: (params?: { from?: string; to?: string; branch_id?: string; worker_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.branch_id) q.set('branch_id', params.branch_id);
    if (params?.worker_id) q.set('worker_id', params.worker_id);
    const s = q.toString();
    return req('GET', `/shifts${s ? `?${s}` : ''}`);
  },

  // Washes
  startWash: (data: any) => req('POST', '/washes', data),
  getQueue: () => req('GET', '/washes/queue'),
  washDone: (id: string) => req('POST', `/washes/${id}/wash-done`),
  settle: (id: string, data: any) => req('POST', `/washes/${id}/settle`, data),
  settleByToken: (data: any) => req('POST', '/washes/settle-by-token', data),

  // Link a customer to an already-started wash, by scanned start token or by
  // their member code. Turns an anonymous job into a loyalty-earning one.
  attachClient: (id: string, data: { start_token?: string; member_code?: string; use_free_wash?: boolean }) =>
    req('POST', `/washes/${id}/attach-client`, data),
  // One-tap "use it now" for a wash that already has the customer attached
  // (e.g. they scanned their own start-token) — attachClient can't be reused
  // here since it refuses once a client is already linked.
  applyFreeWash: (id: string) => req('POST', `/washes/${id}/apply-free-wash`),
  cancelWash: (id: string, reason: string, note?: string) =>
    req('POST', `/washes/${id}/cancel`, { reason, note }),
  getWash: (id: string) => req('GET', `/washes/${id}`),
  listWashes: (params?: string) => req('GET', `/washes${params ? '?' + params : ''}`),
  getMyToday: () => req('GET', '/washes/mine/today'),

  // Tokens
  startToken: () => req('POST', '/me/washes/start-token'),
  payToken: (washId: string) => req('POST', `/me/washes/${washId}/pay-token`),

  // Reports
  daily: (date: string, branch?: string) => req('GET', `/reports/daily?date=${date}${branch ? '&branch_id=' + branch : ''}`),
  workers: (from: string, to: string) => req('GET', `/reports/workers?from=${from}&to=${to}`),
  cashVariance: (from: string, to: string) => req('GET', `/reports/cash-variance?from=${from}&to=${to}`),
  handovers: (from: string, to: string) => req('GET', `/reports/handovers?from=${from}&to=${to}`),
  carTypeMix: (from: string, to: string) => req('GET', `/reports/car-type-mix?from=${from}&to=${to}`),
  unverified: (from: string, to: string) => req('GET', `/reports/unverified?from=${from}&to=${to}`),
  cancellations: (from: string, to: string) => req('GET', `/reports/cancellations?from=${from}&to=${to}`),
  durations: (from: string, to: string) => req('GET', `/reports/durations?from=${from}&to=${to}`),
  stale: () => req('GET', '/reports/stale'),
  exceptions: (from: string, to: string) => req('GET', `/reports/exceptions?from=${from}&to=${to}`),
  branches: (from: string, to: string) => req('GET', `/reports/branches?from=${from}&to=${to}`),

  // Day-by-day series for charting. Every day in the window comes back, zero
  // days included, so a quiet day reads as a gap rather than disappearing.
  trend: (days = 14, branchId?: string) =>
    req('GET', `/reports/trend?days=${days}${branchId ? '&branch_id=' + branchId : ''}`),

  // Who is holding cash right now, org-wide, with how long they have held it.
  cashPosition: (branchId?: string) =>
    req('GET', `/reports/cash-position${branchId ? '?branch_id=' + branchId : ''}`),
  loyalty: (from: string, to: string) => req('GET', `/reports/loyalty?from=${from}&to=${to}`),

  // Platform (sysadmin / SaaS tier)
  platformStats: () => req('GET', '/reports/platform/stats'),
  platformOrgs: () => req('GET', '/platform/orgs'),
  platformOrg: (id: string) => req('GET', `/platform/orgs/${id}`),

  // Creates the org AND its first orgadmin in one transaction; returns a
  // one-time temp password for that admin.
  createOrg: (data: {
    name: string;
    slug: string;
    phone?: string;
    contact_name?: string;
    admin_name: string;
    admin_email: string;
    admin_phone?: string;
  }) => req('POST', '/platform/orgs', data),

  updateOrg: (id: string, data: { name?: string; contact_name?: string; plan?: string }) =>
    req('PATCH', `/platform/orgs/${id}`, data),
  suspendOrg: (id: string, reason: string) => req('POST', `/platform/orgs/${id}/suspend`, { reason }),
  activateOrg: (id: string) => req('POST', `/platform/orgs/${id}/activate`),

  // Add another orgadmin to an existing org
  addOrgAdmin: (orgId: string, data: { full_name: string; email: string; phone?: string }) =>
    req('POST', `/platform/orgs/${orgId}/admins`, data),

  // Fellow platform admins (sysadmins)
  listPlatformAdmins: () => req('GET', '/platform/admins'),
  createPlatformAdmin: (data: { full_name: string; username?: string; email: string; phone?: string }) =>
    req('POST', '/platform/admins', data),
  resetPlatformAdminPassword: (id: string) => req('POST', `/platform/admins/${id}/reset-password`),

  // ── SaaS billing (platform side) ──────────────────────────────
  listPlans: () => req('GET', '/platform/plans'),
  createPlan: (data: {
    code: string; name: string; price_ugx: number;
    billing_cycle?: 'monthly' | 'quarterly' | 'yearly';
    max_branches?: number | null; description?: string; sort_order?: number;
  }) => req('POST', '/platform/plans', data),
  updatePlan: (id: string, data: {
    name?: string; price_ugx?: number;
    billing_cycle?: 'monthly' | 'quarterly' | 'yearly';
    max_branches?: number | null; description?: string; sort_order?: number; active?: boolean;
  }) => req('PATCH', `/platform/plans/${id}`, data),

  setOrgSubscription: (orgId: string, data: {
    plan_id?: string | null;
    billing_status?: 'trial' | 'active' | 'past_due' | 'cancelled';
    trial_ends_at?: string | null;
    next_due_at?: string | null;
    billing_notes?: string | null;
  }) => req('PUT', `/platform/orgs/${orgId}/subscription`, data),

  recordOrgPayment: (orgId: string, data: {
    amount_ugx: number; period_start: string; period_end: string;
    method?: 'cash' | 'mobile_money' | 'bank_transfer' | 'card' | 'other';
    reference?: string; note?: string; advance_due_date?: boolean;
  }) => req('POST', `/platform/orgs/${orgId}/payments`, data),

  billingSummary: () => req('GET', '/platform/billing/summary'),

  // Exceptions
  correctWash: (id: string, data: any) => req('POST', `/washes/${id}/correct`, data),
  reverseWash: (id: string, reason: string) => req('POST', `/washes/${id}/reverse`, { reason }),
  resolveDispute: (id: string, data: any) => req('POST', `/washes/${id}/resolve-dispute`, data),

  // Support — every role can report a problem; who can SEE what is decided
  // server-side (own reports / own org / everything).
  createIssue: (data: {
    category: 'bug' | 'wrong_data' | 'cannot_do_my_job' | 'suggestion' | 'account_access' | 'other';
    severity?: 'low' | 'normal' | 'high' | 'blocking';
    subject: string;
    body: string;
    context?: Record<string, any>;
  }) => req('POST', '/issues', data),
  listIssues: (status?: string) => req('GET', `/issues${status ? '?status=' + status : ''}`),
  // Org admins triage their own organisation's reports; platform admins
  // triage anything. `escalate` hands one the org cannot fix to the platform
  // team — rejected for a platform admin, who has nobody to escalate to.
  updateIssue: (
    id: string,
    data: {
      status: 'open' | 'in_progress' | 'resolved' | 'closed';
      resolution?: string;
      escalate?: boolean;
      escalation_note?: string;
    }
  ) => req('PATCH', `/issues/${id}`, data),

  // Client
  clientLoyalty: () => req('GET', '/me/washes/loyalty'),
  clientHistory: () => req('GET', '/me/washes/history'),
  clientActive: () => req('GET', '/me/washes/active'),
  clientLedger: () => req('GET', '/me/washes/loyalty/ledger'),
  clientQR: () => req('GET', '/me/washes/qr'),
  lookupClient: (code: string) => req('GET', `/clients/lookup?member_code=${code}`),
};
