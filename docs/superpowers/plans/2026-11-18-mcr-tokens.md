# MCR tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Aplicar identidad MCR y temas reales al frontend existente.
**Architecture:** Tokens semánticos Tailwind existentes, controlador local de tema antes del render y select React. Font assets locales autorizados.
**Tech Stack:** React, Vite, Tailwind 4, Playwright/Vitest existentes; sin paquetes nuevos.
**Spec:** `docs/superpowers/specs/2026-11-18-mcr-tokens-design.md`

## Global Constraints

Sin cambios de negocio/API/contratos/migraciones/.env/lockfile. No commit inicial/worktree sin HEAD; preservar copia original y evidencia. Guías 01–02 y decisiones de alcance del usuario gobiernan la entrega.

## Review Focus

- Preferencia corrupta o storage denegado: render funcional con sistema, selector sigue funcionando en memoria.
- Cambio del SO: afecta sistema y no sobreescribe elección explícita; sincronización entre pestañas.
- Primer render/recarga: tema aplicado antes de React y fuente swap local con fallback.
- Superficies y variantes: enlaces, foco, inputs, destructive, disabled y seleccionado legibles en dos temas/forced colors.
- Logo y cobertura: conservar PNG original, no usar variante infiel; no mutar negocio o incorporar datos reales en capturas.

### Task 1: Contrato del tema

Files: `tests/e2e/appearance.spec.ts`, `apps/web/public/theme-init.js`, `apps/web/src/components/theme-select.tsx`, `apps/web/index.html`, `apps/web/src/app/root-layout.tsx`.
Interfaces: DOM `data-theme:light|dark`, `data-theme-preference:light|dark|system`, eventos `mcr:set-theme`/`mcr:theme-change`; storage `mcr-theme`.

- [x] Escribir E2E de elección, recarga, sistema, storage bloqueado/corrupto y sincronización; ejecutarlo RED contra app actual.
- [x] Implementar controlador/selector y bootstrap. Ejecutar E2E GREEN y revisar consola/foco.

### Task 2: Tokens y activos

Files: `apps/web/src/styles.css`, `apps/web/public/fonts/google-sans/*`, primitivas y usos de superficies/text-primary de features, `eslint.config.mjs` para JS de navegador.

- [x] Añadir pruebas navegador para contraste real de texto, acciones, enlaces, foco y límites, y fuente cargada; verificar RED.
- [x] Descargar solo WOFF2 oficiales y OFL, guardar procedencia y hashes. Aplicar paleta, escala y estados; usar PNG original.
- [x] Reemplazar superficies blancas y enlaces con semántica sin cambiar lógica. Verificar contraste/teclas/forced colors y capturas en ambos temas.

Ruling: se añade `apps/web/design-system.html` y `src/dev/design-system.tsx` como espécimen de desarrollo de guía 01. Usa primitivas reales para verificar variantes y no entra en el build predeterminado de Vite.

### Task 3: Cierre

Files: nueva evidencia bajo `docs/verification/2026-11-18-mcr-tokens/`, lista de tareas y formato del paquete original.

- [x] Normalizar solo formato del paquete recibido; verificar equivalencia Markdown de contenido.
- [x] Ejecutar pnpm check, integración PostgreSQL y E2E completos; corregir regresiones del alcance y revisar el cambio completo.
- [x] Capturar cuatro pantallas en dos temas/móvil/escritorio, medir bundle/carga frente a baseline y verificar hashes de archivos ajenos.
- [x] Actualizar lista, decisiones, pruebas, mediciones y límites reales. No avanzar al punto 4.

Ruling: las capturas detectaron +92 px de header por logo y selector en filas separadas. Se agrupa selector con logo y se conserva altura de imagen de 40 px, con ancho adaptativo; es corrección de regresión del punto 3, sin implementar sidebar/shell del punto 5.

Ruling: la medición con la fuente oficial muestra coste adicional de carga restringida. Se aplica lazyRouteComponent existente de TanStack Router a módulos operativos, manteniendo acceso/inicio y contratos, con pending accesible. Es optimización frontend autorizada por guías 10–11 y petición integral del usuario, necesaria para no trasladar sin tratar la regresión de carga. Prueba de red RED demuestra descarga anticipada de calendario; suites completas verificarán navegación/permisos.

Ruling de entrega: se mantiene un controlador externo local con defer, anterior al módulo principal, para paralelizar descarga/parseo y conservar CSP script-src self. Se descarta la alternativa inline/hash porque requiere coordinar configuración externa de despliegue. La prueba de producción fuerza un retardo del controlador y comprueba orden respecto a entrada SPA y bloqueo de inline ajeno, sin cambiar cabeceras del producto.

Cierre de implementación/verificación: [informe](../../verification/2026-11-18-mcr-tokens/README.md). Presupuestos globales de LCP/CLS y rediseño integral pendientes, con valores finales y alcance en la matriz DoD; no se afirma autorización de producción.
