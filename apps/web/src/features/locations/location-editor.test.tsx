import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocationEditor } from './location-editor';
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn() }));

describe('LocationEditor', () => {
  it('pide descartar antes de cerrar un borrador y conserva texto al rechazar', () => {
    const close = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <LocationEditor title="Nuevo centro" pending={false} onClose={close}>
        <input name="name" aria-label="Nombre" defaultValue="" />
      </LocationEditor>,
    );
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Centro norte' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Centro norte');
    confirm.mockRestore();
  });
  it('impide cerrar durante envío o actualización posterior', () => {
    const close = vi.fn();
    render(
      <LocationEditor title="Nuevo centro" pending onClose={close}>
        <input name="name" aria-label="Nombre" />
      </LocationEditor>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    expect(close).not.toHaveBeenCalled();
  });
  it.each(['texto', 'casilla', 'selección'])(
    'permite cerrar sin confirmar al revertir %s',
    (kind) => {
      const close = vi.fn();
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(
        <LocationEditor title="Nuevo centro" pending={false} onClose={close}>
          <input name="name" aria-label="Nombre" defaultValue="Centro" />
          <input
            name="active"
            aria-label="Activo"
            type="checkbox"
            defaultChecked
          />
          <select name="location" aria-label="Centro" defaultValue="a">
            <option value="a">A</option>
            <option value="b">B</option>
          </select>
        </LocationEditor>,
      );
      if (kind === 'texto') {
        fireEvent.change(screen.getByLabelText('Nombre'), {
          target: { value: 'Modificado' },
        });
        fireEvent.change(screen.getByLabelText('Nombre'), {
          target: { value: 'Centro' },
        });
      } else if (kind === 'casilla') {
        fireEvent.click(screen.getByLabelText('Activo'));
        fireEvent.click(screen.getByLabelText('Activo'));
      } else {
        fireEvent.change(screen.getByLabelText('Centro'), {
          target: { value: 'b' },
        });
        fireEvent.change(screen.getByLabelText('Centro'), {
          target: { value: 'a' },
        });
      }
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
      expect(confirm).not.toHaveBeenCalled();
      expect(close).toHaveBeenCalledOnce();
      confirm.mockRestore();
    },
  );
  it('enfoca el primer campo y retorna al respaldo si desaparece el disparador', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      const [showTrigger, setShowTrigger] = useState(true);
      return (
        <>
          <button id="fallback">Nuevo centro</button>
          {showTrigger && (
            <button onClick={() => setOpen(true)}>Editar centro</button>
          )}
          {open && (
            <LocationEditor
              title="Editar centro"
              pending={false}
              initialFocusId="initial"
              returnFocusId="fallback"
              onClose={() => {
                setShowTrigger(false);
                setOpen(false);
              }}
            >
              <input
                id="initial"
                name="name"
                aria-label="Nombre"
                defaultValue="Centro"
              />
            </LocationEditor>
          )}
        </>
      );
    }
    render(<Harness />);
    screen.getByRole('button', { name: 'Editar centro' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'Editar centro' }));
    await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Nuevo centro' }),
      ).toHaveFocus(),
    );
  });
});
