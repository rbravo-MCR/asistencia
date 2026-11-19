import { useQuery } from '@tanstack/react-query';
import { Check } from 'typebox/value';
import { ReadinessSchema } from '@asistencia/contracts';
import {
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

async function checkReadiness({ signal }: { signal: AbortSignal }) {
  const response = await fetch('/api/health/ready', {
    signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Servicio no disponible');
  const data: unknown = await response.json();
  if (!Check(ReadinessSchema, data)) throw new Error('Respuesta inesperada');
  return data;
}

export function SystemStatus() {
  const query = useQuery({
    queryKey: ['system', 'readiness'],
    queryFn: checkReadiness,
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (query.isPending)
    return (
      <div
        role="status"
        className="flex items-center gap-3 text-muted-foreground"
      >
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
        Comprobando conexión…
      </div>
    );
  if (query.isError)
    return (
      <div className="space-y-4">
        <div role="alert" className="flex items-start gap-3 text-destructive">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0"
          />
          <p>
            No se pudo confirmar la conexión. Intenta de nuevo en un momento.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw aria-hidden="true" />
          {query.isFetching ? 'Comprobando…' : 'Reintentar'}
        </Button>
      </div>
    );
  return (
    <div role="status" className="flex items-center gap-3 text-success">
      <CheckCircle2 aria-hidden="true" className="size-5" />
      <span>Servicios disponibles</span>
    </div>
  );
}
