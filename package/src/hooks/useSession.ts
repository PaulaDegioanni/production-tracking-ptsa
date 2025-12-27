// src/hooks/useSession.ts
'use client';

import * as React from 'react';

import type { SessionUser } from '@/lib/auth/types';

type SessionResponse = {
  user: SessionUser | null;
};

export const useSession = (autoLoad = true) => {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [loading, setLoading] = React.useState<boolean>(autoLoad);
  const [error, setError] = React.useState<string | null>(null);

  const fetchSession = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/session', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('No se pudo cargar la sesión');
      }

      const data = (await response.json()) as SessionResponse;
      setUser(data.user ?? null);
    } catch (err) {
      setUser(null);
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al obtener la sesión'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (autoLoad) {
      fetchSession();
    }
  }, [autoLoad, fetchSession]);

  return {
    user,
    loading,
    error,
    refresh: fetchSession,
  };
};

