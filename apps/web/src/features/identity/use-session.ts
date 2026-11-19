import { createContext, useContext } from 'react';
import type { SessionView } from '@asistencia/contracts';
export type SessionContextValue = {
  session: SessionView | null | undefined;
  loading: boolean;
  error: boolean;
  retry: () => void;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clear: () => Promise<void>;
};
export const SessionContext = createContext<SessionContextValue | null>(null);
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('La sesión requiere SessionProvider.');
  return context;
}
