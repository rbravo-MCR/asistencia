# Identidad y tokens MCR — punto 3

Fecha: 18-11-2026. Alcance: identidad visual, tipografía, tokens y temas; se conservan la estructura de pantallas, contratos y reglas de negocio. El rediseño de componentes y shell corresponde a los puntos posteriores.

## Cambios

- `apps/web/src/styles.css`: siete colores corporativos, superficies claro/oscuro, texto y enlaces accesibles, foco, límites funcionales, feedback semántico, acciones destructivas separadas de texto de error, escala 4 px, radios y movimiento reducido. Tailwind usa un único selector `data-theme` para sus variantes dark.
- `apps/web/public/theme-init.js`: tema claro, oscuro y sistema antes de React y del primer pintado; `mcr-theme` es la única preferencia persistida. Admite preferencia inválida, storage bloqueado, cambios del sistema y sincronización entre pestañas. No toca sesión ni cachés privados.
- `apps/web/src/components/theme-select.tsx`: select nativo accesible en el header actual. Las superficies blancas fijas y textos del color de acción pasan a tokens semánticos. Foco y selección conservan indicadores distintos en colores forzados.
- Logo: se reemplaza la variante WebP de escudo/mapa por el PNG original de texto México Car Rental. El archivo original queda intacto; object-fit conserva proporciones y recorta solo margen vacío. Fondo negro y espacio libre conservan el logotipo blanco/amarillo.
- Google Sans normal/itálica variable en peso 400–700, tamaño óptico 17 fijo para lectura de UI y menor transferencia, latin/latin-ext, alojada localmente con `font-display:swap`, fallback de sistema y preload del subconjunto normal latino. La app no consulta fuentes externas. [Licencia oficial OFL 1.1](https://raw.githubusercontent.com/google/fonts/main/ofl/googlesans/OFL.txt), [metadata oficial](https://raw.githubusercontent.com/google/fonts/main/ofl/googlesans/METADATA.pb), [procedencia y hashes locales](../../../apps/web/public/fonts/google-sans/PROVENANCE.json). Los archivos WOFF2 provienen del servicio oficial fonts.gstatic.com, no de archivos inventados o fuentes de terceros.
- `apps/web/src/app/router.ts`: carga diferida de módulos operativos con el router instalado; conserva las 22 rutas, búsqueda y controles de acceso. Estado pendiente accesible sin datos ficticios.
- `apps/web/design-system.html` y `src/dev/`: espécimen local de primitivas existentes, con estados normal, secundario, destructivo, deshabilitado, pendiente, error y selección. Solo desarrollo; no se incluye en el build de producción.
- Los 16 documentos originales del paquete UX/UI se normalizan con Prettier para recuperar el gate global. [Equivalencia estructural Markdown](evidence/guide-format-equivalence.json) y [opciones de formato del repositorio](evidence/guide-repository-format-equivalence.json) verificadas; se conservan contenido, reglas y snapshot anterior.

## Decisiones de contraste

El amarillo se usa con negro para acciones y selección. Los enlaces usan azul oscuro en claro y azul claro en oscuro. El rojo oscuro de acciones destructivas mantiene texto blanco; el error en tema oscuro tiene rojo claro independiente. Los bordes decorativos usan `--border`; los inputs/selects/textarea usan `--input` y las variantes de error/foco conservan prioridad.

La prueba de navegador calcula luminancia y contraste de los colores computados: texto normal, acción, enlace, texto secundario y cuatro estados semánticos ≥4.5:1; foco y límites funcionales ≥3:1. No se afirma conformidad WCAG completa por estas pruebas. Forced colors conserva selección de calendario con borde doble, navegación actual subrayada y foco exterior independiente.

## Verificación y evidencia

Base de identidad implementada y verificada. La aceptación integral del producto y los presupuestos de carga/CLS siguen abiertos; no se autoriza producción con esta entrega. Los logs conservan salidas reales y las regresiones RED documentan la ausencia inicial del selector, carga anticipada y defectos de límites/selección.

| Verificación                         | Resultado                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `pnpm check`                         | Aprobado: lint, arquitectura, formato, tipos, 186 pruebas unitarias/UI y build  |
| `pnpm test:integration`              | 175 pruebas / 17 archivos aprobados sobre PostgreSQL real `_test`               |
| Suite E2E completa                   | 62 pruebas aprobadas, escritorio y móvil                                        |
| Revalidación tras bootstrap diferido | 28/28 de apariencia y navegación aprobadas                                      |
| Producción/CSP                       | Tema antes de entrada SPA incluso con retardo de 200 ms; inline ajeno bloqueado |
| Capturas                             | 32 de producción + 4 del espécimen                                              |
| Mediciones                           | 21 cargas de producción, incluidas 3 con fuente bloqueada                       |

Total de suite: **423 pruebas**; las 28 revalidaciones son repeticiones, no casos únicos adicionales. Las suites de negocio se ejecutaron completas tras la partición de rutas; el último ajuste de entrega del bootstrap se revalidó con las 28 y la prueba de producción/CSP. [Comparación baseline/final e índice visual](PERFORMANCE.md).

- [Check completo](evidence/check.txt): lint, grafo de módulos, formato, tipos estrictos, Vitest y build.
- [PostgreSQL](evidence/integration.txt): integración aislada `_test`.
- [E2E](evidence/e2e.txt): suite completa escritorio/móvil con controles de apariencia y flujos existentes.
- [Revisión independiente y correcciones](evidence/review.md).
- [Cambios de fuentes y conservación de backend/contratos/lockfile](evidence/source-changes.json).
- [Bundle de producción](evidence/bundle.json).
- [Revalidación final](evidence/final-appearance-navigation.txt) y [bootstrap/CSP](evidence/bootstrap-production-green.txt).
- [Aceptación por requisito DoD](ACCEPTANCE.md) y [plan incremental completo](../../superpowers/plans/2026-11-18-mcr-premium-frontend.md).

## Límites de esta entrega

No cambia funciones ni permisos: HEAD_ONLY/histórico, `LATE_ABSENCE`, GPS presencial/home office, reintentos, evidencias y saldos permanecen bajo sus contratos. No se modifican backend, contratos, migraciones, paquetes, lockfile, `.env` o datos empresariales.

Se preserva el árbol sin commits y el snapshot del baseline; no se crea un commit inicial que mezcle etapas anteriores. El menú aún necesita el rediseño del punto 5. Las cuatro pantallas capturadas no desbordan; Usuarios y las demás rutas requieren su validación responsive por fase. Persisten CLS y algunos LCP fuera de presupuesto, detallados en PERFORMANCE.md. Las mediciones separan mejoras, costes y límites de esta etapa. No se implementan glassmorphism, sidebar, app móvil, offline, biometría, API nueva o despliegue.
