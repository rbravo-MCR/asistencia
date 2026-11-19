import { Bell, CheckCheck, ArrowUpRight } from 'lucide-react';
import { notificationDestination } from './notification-destination';
import { useWrite } from '../planning/use-write';
import { useQuery } from '@tanstack/react-query';
import {
  NotificationListSchema,
  type SessionView,
} from '@asistencia/contracts';
import { request } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ProtectedPage } from '../identity/protected-page';
import { Page, panelClass } from '../identity/form-fields';
import { QueryFeedback } from '../employees/query-feedback';
import { WriteFeedback } from '../planning/controls';
export function NotificationsPage() {
  return (
    <ProtectedPage>
      {(session) => <NotificationsContent session={session} />}
    </ProtectedPage>
  );
}
function NotificationsContent({ session }: { session: SessionView }) {
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: ({ signal }) =>
      request('/notifications', NotificationListSchema, { signal }),
    retry: false,
  });
  const write = useWrite(session.csrfToken, ['notifications']);
  return (
    <Page
      eyebrow="Tu espacio"
      title="Avisos"
      actions={
        <Button
          type="button"
          variant="outline"
          disabled={
            write.isPending || query.isError || !query.data?.unreadCount
          }
          onClick={() => write.mutate({ path: '/notifications/read-all' })}
        >
          <CheckCheck aria-hidden="true" />
          Marcar todos leídos
        </Button>
      }
      description="Tu bandeja personal de notificaciones internas."
    >
      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary">
              <Bell aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Bandeja personal</h2>
              <p className="text-sm text-muted-foreground">
                Solicitudes y novedades de tu actividad.
              </p>
            </div>
          </div>
          {query.data && !query.isError && (
            <span className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
              {query.data.unreadCount} sin leer
            </span>
          )}
        </div>
        <WriteFeedback mutation={write} />
        <QueryFeedback query={query} empty={query.data?.items.length === 0} />
        <ul className="divide-y">
          {!query.isError &&
            query.data?.items.map((item) => (
              <li
                key={item.id}
                className={`min-w-0 space-y-3 py-5 ${!item.readAt ? 'border-l-2 border-l-primary pl-4' : 'pl-4'}`}
              >
                <h2 className="break-words font-semibold">
                  {item.title}
                  {!item.readAt && (
                    <span className="ml-2 inline-block rounded-full bg-info/10 px-2 py-1 text-xs text-info">
                      Sin leer
                    </span>
                  )}
                </h2>
                <p className="break-words">{item.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString('es-MX')}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {notificationDestination(item.href) && (
                    <a
                      href={item.href}
                      className="inline-flex min-h-11 items-center gap-1 font-medium text-link underline underline-offset-4"
                    >
                      Ver detalle{' '}
                      <ArrowUpRight aria-hidden="true" className="size-4" />
                    </a>
                  )}
                  {!item.readAt && (
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Marcar leído: ${item.title}`}
                      disabled={write.isPending}
                      onClick={() =>
                        write.mutate({ path: `/notifications/${item.id}/read` })
                      }
                    >
                      Marcar leído
                    </Button>
                  )}
                </div>
              </li>
            ))}
        </ul>
      </section>
    </Page>
  );
}
