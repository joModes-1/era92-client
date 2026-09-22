import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setTokens, clearTokens, loadTokens, getActor, setActor, setSessionExpiredHandler } from './index';

interface AuthCtx {
  actor: any;
  loading: boolean;
  logout: () => Promise<void>;
  refreshActor: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [actor, setActorState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const logout = async () => {
    await api.logout();
    await clearTokens();
    setActorState(null);
  };

  const refreshActor = async () => {
    const me = await api.getMe();
    const updated = { ...actor, ...me };
    await setActor(updated);
    setActorState(updated);
  };

  return (
    <Ctx.Provider value={{ actor, loading, logout, refreshActor }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
