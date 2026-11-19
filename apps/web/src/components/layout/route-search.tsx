import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Dialog } from 'radix-ui';
import { Search, ArrowUpRight, X, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { NavigationGroup } from './navigation';

const normalizeSearch = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es-MX');

export function RouteSearch({ navigation }: { navigation: NavigationGroup[] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select'))
      )
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setText('');
        setOpen(true);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  const query = normalizeSearch(text.trim());
  const searchable: NavigationGroup[] = navigation.map((group) => ({
    ...group,
    items: group.items.some((item) => item.to === '/configuracion')
      ? [
          ...group.items,
          {
            to: '/configuracion/asistencia' as const,
            label: 'Política de asistencia',
            icon: Settings2,
          },
        ]
      : group.items,
  }));
  const filtered = searchable
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        normalizeSearch(
          `${group.label} ${item.label} ${item.description ?? ''} ${item.keywords?.join(' ') ?? ''}`,
        ).includes(query),
      ),
    }))
    .filter((group) => group.items.length);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) setText('');
      }}
    >
      <Dialog.Trigger asChild>
        <button
          aria-label="Buscar secciones"
          className="flex size-11 shrink-0 items-center justify-center gap-3 rounded-lg border border-white/20 text-sm text-navigation-foreground hover:bg-navigation-hover 2xl:w-auto 2xl:px-3"
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="hidden 2xl:inline">Buscar una sección</span>
          <kbd className="hidden rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-white/65 2xl:inline">
            Ctrl K
          </kbd>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55" />
        <Dialog.Content className="mcr-floating-surface fixed left-1/2 top-[10dvh] z-[60] flex max-h-[80dvh] w-[calc(100%_-_2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl shadow-2xl outline-none">
          <div className="border-b p-5">
            <Dialog.Title className="font-semibold">
              Buscar secciones
            </Dialog.Title>
            <Dialog.Description className="mt-1 pr-8 text-xs leading-5 text-muted-foreground">
              Encuentra una sección disponible para tu cuenta.
            </Dialog.Description>
            <Input
              type="search"
              aria-label="Buscar una sección"
              placeholder="¿A dónde quieres ir?"
              className="mt-4 h-11"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <div className="min-h-0 overflow-y-auto p-2">
            {filtered.length ? (
              filtered.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-1 pt-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    {group.label}
                  </p>
                  {group.items.map(({ to, label, description, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      aria-label={label}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
                    >
                      <Icon
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{label}</span>
                        {description && (
                          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                            {description}
                          </span>
                        )}
                      </span>
                      <ArrowUpRight
                        className="size-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                </div>
              ))
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                No encontramos secciones.
              </p>
            )}
          </div>
          <Dialog.Close
            aria-label="Cerrar búsqueda"
            className="absolute right-3 top-2 flex size-11 items-center justify-center rounded-lg hover:bg-secondary"
          >
            <X className="size-4" aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
