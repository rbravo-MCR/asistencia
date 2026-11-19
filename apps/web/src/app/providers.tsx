import { dataChangedEvent } from '@/lib/api';
import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from '@/features/identity/session';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({ defaultOptions: { queries: { staleTime: 30000 } } }),
  );
  useEffect(() => {
    const refresh = () => {
      void client.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'dashboard' || q.queryKey[0] === 'configuration',
      });
    };
    window.addEventListener(dataChangedEvent, refresh);
    return () => window.removeEventListener(dataChangedEvent, refresh);
  }, [client]);
  return (
    <QueryClientProvider client={client}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
