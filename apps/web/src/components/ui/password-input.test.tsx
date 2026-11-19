import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { PasswordInput } from './password-input';

it('permite mostrar y ocultar sin perder el valor ni el autocompletado', async () => {
  render(
    <label>
      Contraseña
      <PasswordInput
        autoComplete="current-password"
        defaultValue="Texto con espacios "
      />
    </label>,
  );
  const input = screen.getByLabelText('Contraseña', { exact: true });
  expect(input).toHaveAttribute('type', 'password');
  await userEvent.click(
    screen.getByRole('button', { name: 'Mostrar contraseña' }),
  );
  expect(input).toHaveAttribute('type', 'text');
  expect(input).toHaveValue('Texto con espacios ');
  expect(input).toHaveAttribute('autocomplete', 'current-password');
  await userEvent.click(
    screen.getByRole('button', { name: 'Ocultar contraseña' }),
  );
  expect(input).toHaveAttribute('type', 'password');
  expect(input).toHaveValue('Texto con espacios ');
});

it('no habilita el control de visibilidad mientras el campo está deshabilitado', () => {
  render(<PasswordInput aria-label="Clave" disabled />);
  expect(
    screen.getByRole('button', { name: 'Mostrar contraseña' }),
  ).toBeDisabled();
});
