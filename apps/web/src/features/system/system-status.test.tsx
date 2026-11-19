import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SystemStatus } from './system-status';

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SystemStatus />
    </QueryClientProvider>,
  );
}

describe('estado del servicio', () => {
  it('muestra carga mientras consulta la API', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    mount();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Comprobando conexión',
    );
  });
  it('confirma la conexión cuando API y PostgreSQL responden', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ status: 'ok', database: 'ok' })),
        ),
    );
    mount();
    expect(await screen.findByText('Servicios disponibles')).toBeVisible();
  });
  it('permite reintentar tras un fallo real de HTTP', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'ok', database: 'ok' })),
      );
    vi.stubGlobal('fetch', fetch);
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo confirmar la conexión',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Servicios disponibles')).toBeVisible();
  });
  it('rechaza una respuesta que no cumple el contrato compartido', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }))),
    );
    mount();
    expect(await screen.findByRole('alert')).toBeVisible();
  });
});
