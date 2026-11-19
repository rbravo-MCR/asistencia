import { useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RequestAttachments({ required }: { required: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      <label htmlFor="requestEvidence" className="block text-sm font-medium">
        Evidencias ({required ? 'obligatorias' : 'opcional'})
      </label>
      <label
        htmlFor="requestEvidence"
        className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input bg-secondary/25 p-4 hover:bg-secondary/60 focus-within:outline-2 focus-within:outline-ring"
      >
        <Paperclip className="size-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block text-sm font-medium">
            {names.length ? 'Cambiar archivos' : 'Seleccionar archivos'}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            PDF, PNG o JPEG · Hasta 3 archivos de 1 MiB
          </span>
        </span>
        <input
          ref={input}
          id="requestEvidence"
          name="evidence"
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          multiple
          aria-required={required}
          aria-describedby="request-evidence-help"
          className="sr-only"
          onChange={(event) =>
            setNames(
              Array.from(event.currentTarget.files ?? []).map(
                (file) => file.name,
              ),
            )
          }
        />
      </label>
      {names.length > 0 && (
        <div className="rounded-xl border p-3">
          <ul className="space-y-1 break-words text-sm">
            {names.map((name, index) => (
              <li key={`${name}-${index}`}>{name}</li>
            ))}
          </ul>
          <Button
            type="button"
            variant="ghost"
            className="mt-2 min-h-11"
            onClick={() => {
              if (input.current) {
                input.current.value = '';
                input.current.dispatchEvent(
                  new Event('change', { bubbles: true }),
                );
              }
            }}
          >
            Quitar archivos
          </Button>
        </div>
      )}
      <p
        id="request-evidence-help"
        className="text-xs leading-5 text-muted-foreground"
      >
        Se adjuntan al enviar la solicitud. Solo podrán descargarlos las
        personas autorizadas para revisarla.
      </p>
    </div>
  );
}
