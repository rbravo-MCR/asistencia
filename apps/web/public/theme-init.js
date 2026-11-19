(() => {
  const root = document.documentElement;
  const storageKey = 'mcr-theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = (value) => ['light', 'dark', 'system'].includes(value);
  const read = () => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return valid(stored) ? stored : 'system';
    } catch {
      return 'system';
    }
  };
  let preference = read();
  const apply = (value, persist = false) => {
    preference = value;
    root.dataset.themePreference = value;
    root.dataset.theme =
      value === 'system' ? (media.matches ? 'dark' : 'light') : value;
    root.style.colorScheme = root.dataset.theme;
    if (persist) {
      try {
        window.localStorage.setItem(storageKey, value);
      } catch {
        // La elección sigue funcionando en memoria si el navegador bloquea storage.
      }
    }
    window.dispatchEvent(new Event('mcr:theme-change'));
  };
  window.addEventListener('mcr:set-theme', (event) => {
    if (valid(event.detail)) apply(event.detail, true);
  });
  media.addEventListener('change', () => {
    if (preference === 'system') apply(preference);
  });
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey || event.key === null) apply(read());
  });
  apply(preference);
})();
