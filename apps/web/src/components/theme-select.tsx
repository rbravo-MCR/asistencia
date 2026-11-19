import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  window.addEventListener('mcr:theme-change', onChange);
  return () => window.removeEventListener('mcr:theme-change', onChange);
}
function getPreference() {
  return document.documentElement.dataset.themePreference ?? 'system';
}
export function ThemeSelect() {
  const preference = useSyncExternalStore(
    subscribe,
    getPreference,
    () => 'system',
  );
  return (
    <label className="flex items-center gap-2 text-sm text-navigation-foreground">
      Tema
      <select
        aria-label="Tema de apariencia"
        className="min-h-11 rounded-md border border-input bg-navigation px-3 text-navigation-foreground"
        value={preference}
        onChange={(event) =>
          window.dispatchEvent(
            new CustomEvent('mcr:set-theme', { detail: event.target.value }),
          )
        }
      >
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
        <option value="system">Sistema</option>
      </select>
    </label>
  );
}
