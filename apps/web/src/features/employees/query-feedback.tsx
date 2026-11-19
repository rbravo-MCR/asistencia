import { Button } from '@/components/ui/button';
import { AsyncState } from '@/components/patterns/async-state';
export function QueryFeedback({
  query,
  empty,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    isFetching: boolean;
    refetch: () => unknown;
  };
  empty?: boolean;
}) {
  if (query.isPending) return <AsyncState kind="loading" title="Cargando…" />;
  if (query.isError)
    return (
      <AsyncState
        kind="error"
        title="No se pudo cargar la información."
        description="Revisa tu conexión e inténtalo de nuevo."
        action={
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => {
              void query.refetch();
            }}
          >
            Reintentar carga
          </Button>
        }
      />
    );
  return (
    <>
      {empty && (
        <AsyncState
          kind="empty"
          title="No hay registros disponibles en tu alcance."
        />
      )}
      <Button
        variant="ghost"
        disabled={query.isFetching}
        onClick={() => {
          void query.refetch();
        }}
      >
        Actualizar listado
      </Button>
    </>
  );
}
