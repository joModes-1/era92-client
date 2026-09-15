import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setTokens, clearTokens, loadTokens, getActor, setActor, setSessionExpiredHandler } from './index';

interface AuthCtx {
  actor: any;
  loading: boolean;
  mustChangePassword: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (cur: string, pwd: string) => Promise<void>;
  refreshActor: () => Promise<void>;
}

// A "wrong identifier/password" error from one auth type shouldn't stop us
// trying the next type — only surface an error if every type rejected it.
// This also covers shape-validation failures (e.g. platform login requiring
// an email — a non-email username should just fall through to the next type,
// not be treated as a fatal error).
function isCredentialError(e: any): boolean {
  const msg = (e?.message || '').toLowerCase();
  return (
    msg.includes('invalid') ||
    msg.includes('not found') ||
    msg.includes('no account') ||
    msg.includes('no password') ||
    msg.includes('validation failed') ||
    msg.includes('suspended')
  );
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [actor, setActorState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Derived from the actor, never stored alongside it. Held as its own
  // useState, this was a second copy of a fact the actor already carried,
  // and the two were written by separate setters with an `await setActor()`
  // between them. Any render landing in that gap saw a fresh actor with a
  // stale flag — which is what kept the forced-change screen mounted after
  // the password had already been changed, leaving logging out as the only
  // way forward. One source of truth cannot drift from itself.
  const mustChangePassword = !!actor?.must_change_password;

  useEffect(() => {
    (async () => {
      await loadTokens();
      const saved = await getActor();
      if (saved) {
        setActorState(saved);
      }
      setLoading(false);
    })();

    // Any request anywhere in the app can discover the session is dead
    // (access token expired and the refresh token is also unusable). When
    // that happens, drop back to the login screen instead of leaving a
    // dead error on whatever screen the person happened to be on.
    setSessionExpiredHandler(() => {
      setActorState(null);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  // Single login form for every role: try each account type in turn and
  // adopt whichever one recognizes the identifier/password. The role the
  // person ends up with is whatever the backend says it is — nothing here
  // lets the caller pick a role up front.
  const login = async (identifier: string, password: string) => {
    const attempts: Array<() => Promise<void>> = [
      async () => {
        const data = await api.loginStaff(identifier, password);
        await setTokens(data.access_token, data.refresh_token);
        const me = await api.getMe();
        const a = { ...me, type: 'staff', role: data.role, org_id: data.org_id, branch_id: data.branch_id, must_change_password: data.must_change_password };
        await setActor(a);
        setActorState(a);
      },
      async () => {
        const data = await api.loginPlatform(identifier, password);
        await setTokens(data.access_token, data.refresh_token);
        const a = { type: 'platform', role: 'sysadmin', must_change_password: data.must_change_password };
        await setActor(a);
        setActorState(a);
      },
      async () => {
        const data = await api.loginClient(identifier, password);
        await setTokens(data.access_token, data.refresh_token);
        const me = await api.getMe();
        const a = { ...me, type: 'client', role: 'client', must_change_password: false };
        await setActor(a);
        setActorState(a);
      },
    ];

    let lastError: any = null;
    for (const attempt of attempts) {
      try {
        await attempt();
        return;
      } catch (e: any) {
        lastError = e;
        if (!isCredentialError(e)) throw e; // real/unexpected error — stop and surface it
      }
    }
    throw lastError || new Error('Invalid username/phone or password');
  };

  const logout = async () => {
    await api.logout();
    await clearTokens();
    setActorState(null);
  };

  const changePassword = async (cur: string, pwd: string) => {
    // Three actor types, three different tables and three different routes
    // on the server — a client isn't 'staff' just because it isn't
    // 'platform'. Sending a client's request to /auth/staff/change-password
    // got a flat 403 there, which is what made changing a client's password
    // look broken.
    const data =
      actor?.type === 'platform'
        ? await api.changePasswordPlatform(cur, pwd)
        : actor?.type === 'client'
        ? await api.changePasswordClient(cur, pwd)
        : await api.changePassword(cur, pwd);

    // The server revokes every refresh token on a password change — including
    // this session's. It hands back a replacement pair, and storing it is what
    // keeps the user signed in; without this the next refresh fails and they
    // are dumped on the login screen to re-type the password they just set.
    if (data?.access_token && data?.refresh_token) {
      await setTokens(data.access_token, data.refresh_token);
    }

    // Clearing the flag on the actor is what dismisses the forced-change
    // screen. Fall back to the stored actor rather than to `{}` — spreading
    // an empty object would produce an actor with no type or role at all,
    // which routes to the wrong drawer and fails the next authed call,
    // dropping the person back to the login screen.
    const base = actor || (await getActor());
    if (!base) return;
    const updated = { ...base, must_change_password: false };
    await setActor(updated);
    setActorState(updated);
  };

  const refreshActor = async () => {
    const me = await api.getMe();
    const updated = { ...actor, ...me };
    await setActor(updated);
    setActorState(updated);
  };

  return (
    <Ctx.Provider value={{ actor, loading, mustChangePassword, login, logout, changePassword, refreshActor }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
