# Tokens y tipografía

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Integración

`apps/web/src/styles.css` usa Tailwind 4 `@theme inline` y variables semánticas. Evolucionar esa interfaz; no duplicar sistemas. Ejemplo inicial, ajustar contraste tras pruebas:

```css
:root {
  --mcr-black: #000000;
  --mcr-yellow: #fadb25;
  --mcr-white: #ffffff;
  --mcr-earth: #2b261a;
  --mcr-blue: #1275b5;
  --mcr-green: #67cf55;
  --mcr-red: #b81111;
  --background: #f6f7f8;
  --foreground: #171717;
  --card: #ffffff;
  --primary: var(--mcr-yellow);
  --primary-foreground: var(--mcr-black);
  --secondary: #efeff1;
  --muted-foreground: #52525b;
  --border: #d4d4d8;
  --ring: #1275b5;
  --success-text: #236b29;
  --warning-text: #805600;
  --info-text: #125c91;
  --danger-text: #b81111;
  --surface-solid: #ffffff;
  --duration-fast: 150ms;
  --duration-normal: 220ms;
}
[data-theme='dark'] {
  color-scheme: dark;
  --background: #101010;
  --foreground: #fafafa;
  --card: #1b1b1b;
  --secondary: #272727;
  --muted-foreground: #b5b5be;
  --border: #505050;
  --ring: #fadb25;
  --success-text: #67cf55;
  --warning-text: #fadb25;
  --info-text: #8cc9f1;
  --danger-text: #ff9999;
  --surface-solid: #1b1b1b;
}
@theme inline {
  --font-sans: 'Google Sans', ui-sans-serif, system-ui, sans-serif;
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-ring: var(--ring);
  --color-destructive: var(--danger-text);
}
```

Conservar mappings existentes de card, foreground, accent, input y muted. Unificar tema con variante dark de Tailwind si se utiliza; no mezclar selectores incompatibles. Los colores complementarios son propuestas, no ampliación de marca oficial. Amarillo y verde brillante no como texto sobre blanco; variantes semánticas deben contrastar.

## Fuente oficial

URL suministrada: https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700
Verificar licencia y disponibilidad antes de copiar archivos de fuente; preferir WOFF2 local autorizado con `font-display: swap`. Si se usa URL externa, revisar CSP, privacidad y rendimiento; sin bloquear render por la fuente. Pesos 400/500/600/700; itálica solo cuando procede. No inventar archivos de fuente. Medir CLS por fallback.

## Aceptación

Sin hex de marca dispersos en features; colores de negocio se resuelven mediante variantes semánticas. Probar contrastes AA, foco, disabled y colores en modo alto contraste. No todos los bordes decorativos requieren 3:1, pero los límites funcionales necesarios sí.
