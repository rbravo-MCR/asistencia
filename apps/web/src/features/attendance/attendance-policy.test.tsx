import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { SessionView } from '@asistencia/contracts';
import { Providers } from '@/app/providers';
import { AttendancePolicy } from './attendance-policy';
const id = '5ff93c1e-33a0-4f04-b5d1-503f339d0c61';
const policy = {
  id,
  version: 2,
  lateToleranceMinutes: 10,
  earlyEntryMinutes: 30,
  lateExitMinutes: 120,
  administrativeAbsenceMinutes: 30,
  activatedAt: '2026-11-13T14:00:00Z',
  createdAt: '2026-11-18T14:00:00Z',
};
it.each([false, true])(
  'keeps configurable administrative cutoff and can disable it (disable=%s)',
  async (disable) => {
    const writes: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, options?: RequestInit) => {
        if (options?.method === 'PUT')
          writes.push(JSON.parse(String(options.body)));
        return new Response(JSON.stringify(policy));
      }),
    );
    render(
      <Providers>
        <AttendancePolicy session={{ csrfToken: 'csrf' } as SessionView} />
      </Providers>,
    );
    const cutoff = await screen.findByLabelText(
      'Falta por llegada tardía administrativa (min)',
    );
    expect(cutoff).toHaveValue(30);
    if (disable) await userEvent.clear(cutoff);
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar política' }),
    );
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({
      administrativeAbsenceMinutes: disable ? null : 30,
    });
  },
);
