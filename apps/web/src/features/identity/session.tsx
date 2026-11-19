import { useEffect, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionScope } from '@/lib/session-scope';
import { SessionSchema, type SessionView } from '@asistencia/contracts';
import { ApiError, request, requestVoid, sessionExpiredEvent } from '@/lib/api';

import { SessionContext } from './use-session';

const sessionKey = ['session'];
export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const previousScope = useRef<string | null>(null);
  const prepareSession = async (session: SessionView | null) => {
    const scope = sessionScope(session);
    if (scope !== previousScope.current || session === null) {
      await client.cancelQueries({
        predicate: (entry) => entry.queryKey[0] !== 'session',
      });
      client.removeQueries({
        predicate: (entry) => entry.queryKey[0] !== 'session',
      });
      client.getMutationCache().clear();
      previousScope.current = scope;
    }
    return session;
  };
  const query = useQuery({
    queryKey: sessionKey,
    retry: false,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      try {
        const session = await request('/auth/session', SessionSchema, {
          signal,
          public: true,
        });
        return await prepareSession(session);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401)
          return prepareSession(null);
        throw error;
      }
    },
  });
  const clear = async () => {
    await client.cancelQueries();
    client.removeQueries({
      predicate: (query) => query.queryKey[0] !== 'session',
    });
    client.getMutationCache().clear();
    previousScope.current = null;
    client.setQueryData(sessionKey, null);
  };
  useEffect(() => {
    const expired = () => {
      void client.cancelQueries().then(() => {
        client.removeQueries({
          predicate: (query) => query.queryKey[0] !== 'session',
        });
        client.getMutationCache().clear();
        previousScope.current = null;
        client.setQueryData(sessionKey, null);
      });
    };
    window.addEventListener(sessionExpiredEvent, expired);
    return () => window.removeEventListener(sessionExpiredEvent, expired);
  }, [client]);
  useEffect(() => {
    if (!query.data) return;
    const timeout = window.setTimeout(
      () => {
        void client.cancelQueries().then(() => {
          client.removeQueries({
            predicate: (query) => query.queryKey[0] !== 'session',
          });
          client.getMutationCache().clear();
          previousScope.current = null;
          client.setQueryData(sessionKey, null);
        });
      },
      Math.max(0, Date.parse(query.data.expiresAt) - Date.now()),
    );
    return () => window.clearTimeout(timeout);
  }, [client, query.data]);
  const login = async (identifier: string, password: string) => {
    const session = await request('/auth/login', SessionSchema, {
      method: 'POST',
      body: { identifier, password },
      public: true,
    });
    await client.cancelQueries();
    client.removeQueries({
      predicate: (query) => query.queryKey[0] !== 'session',
    });
    client.getMutationCache().clear();
    previousScope.current = sessionScope(session);
    client.setQueryData(sessionKey, session);
  };
  const logout = async () => {
    if (query.data)
      await requestVoid('/auth/logout', {
        method: 'POST',
        csrfToken: query.data.csrfToken,
      });
    await clear();
  };
  return (
    <SessionContext.Provider
      value={{
        session: query.data,
        loading: query.isPending,
        error: query.isError,
        retry: () => {
          void query.refetch();
        },
        login,
        logout,
        clear,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
