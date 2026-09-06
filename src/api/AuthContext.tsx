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
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    (async () => {
      await loadTokens();
      const saved = await getActor();
      if (saved) {
        setActorState(saved);
        setMustChangePassword(saved.must_change_password || false);
      }
      setLoading(false);
    })();

    // Any request anywhere in the app can discover the session is dead
    // (access token expired and the refresh token is also unusable). When
    // that happens, drop back to the login screen instead of leaving a
    // dead error on whatever screen the person happened to be on.
    setSessionExpiredHandler(() => {
      setActorState(null);
      setMustChangePassword(false);
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
        setMustChangePassword(data.must_change_password || false);
      },
      async () => {
        const data = await api.loginPlatform(identifier, password);
        await setTokens(data.access_token, data.refresh_token);
        const a = { type: 'platform', role: 'sysadmin', must_change_password: data.must_change_password };
        await setActor(a);
        setActorState(a);
        setMustChangePassword(data.must_change_password || false);
      },
      async () => {
        const data = await api.loginClient(identifier, password);
        await setTokens(data.access_token, data.refresh_token);
        const me = await api.getMe();
        const a = { ...me, type: 'client', role: 'client', must_change_password: false };
        await setActor(a);
        setActorState(a);
        setMustChangePassword(false);
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
    setMustChangePassword(false);
  };

  const changePassword = async (cur: string, pwd: string) => {
    if (actor?.type === 'platform') {
      await api.changePasswordPlatform(cur, pwd);
    } else {
      await api.changePassword(cur, pwd);
    }
    if (actor) {
      const updated = { ...actor, must_change_password: false };
      await setActor(updated);
      setActorState(updated);
    }
    setMustChangePassword(false);
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
