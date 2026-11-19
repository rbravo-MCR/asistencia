import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FormError, selectClass } from '../identity/form-fields';

export function TextField({
  name,
  label,
  type = 'text',
  value,
  required = true,
  step,
  min,
  max,
}: {
  name: string;
  label: string;
  type?: string;
  value?: string | number | undefined;
  required?: boolean;
  step?: string;
  min?: number;
  max?: number;
}) {
  return (
    <Field id={name} label={label}>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        step={step}
        min={min}
        max={max}
      />
    </Field>
  );
}
export function SelectField({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value?: string | undefined;
  children: ReactNode;
}) {
  return (
    <Field id={name} label={label}>
      <select
        id={name}
        name={name}
        defaultValue={value}
        className={selectClass}
        required
      >
        {children}
      </select>
    </Field>
  );
}
export function WriteFeedback({
  mutation,
}: {
  mutation: {
    isPending: boolean;
    isError: boolean;
    isSuccess: boolean;
    error: Error | null;
  };
}) {
  return (
    <>
      <FormError message={mutation.error?.message} />
      {mutation.isPending && <p role="status">Guardando…</p>}
      {mutation.isSuccess && <p role="status">Cambios guardados.</p>}
    </>
  );
}
export function Save({
  pending,
  label = 'Guardar',
}: {
  pending: boolean;
  label?: string;
}) {
  return (
    <Button disabled={pending} type="submit">
      {pending ? 'Guardando…' : label}
    </Button>
  );
}
