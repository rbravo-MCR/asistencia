# UX clara y moderna MCR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task; dominios de planificación y navegación se pueden delegar con dispatching-parallel-agents tras fijar interfaces.

**Goal:** Hacer comprensibles y descubribles los flujos de asignación de turnos, vacaciones y solicitudes dentro de la experiencia MCR existente.

**Architecture:** Conservar features/contratos. Navegación y acciones explican tareas; intenciones tipadas abren creación de solicitud sin mutación. Vacaciones separa contexto personal/equipo. El formulario conserva sus controles montados y añade revisión previa al único envío real.

**Tech Stack:** React, TanStack Router/Query, Radix, Tailwind, RHF/Zod y Lucide existentes, Vitest, Playwright, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-11-19-ux-clarity-design.md`. Builder-check independiente: «nothing important left».

## Global Constraints

- Sin backend, contratos, migraciones, dependencias, lockfile, `.env` o cambios operativos.
- Sin nuevos datos de desarrollo. Capturas locales de lectura; escrituras de QA solo en PostgreSQL `_test`.
- Preservar marca/temas, rutas, permisos, GPS, HEAD_ONLY/histórico, snapshots, sesión/alcance, CSRF, UUID/payload y cifras del servidor.
- Checkout sin HEAD: snapshot guardado, no commit inicial ni worktree vacío.
- Navegador integrado ausente, evidencia mediante Chromium del proyecto ya autorizado en este contexto. No despliegue.

## Review Focus

- Administrador sin empleado: diferenciar permiso de gestión y capacidad de solicitud propia; indicar siguiente acción sin ampliar permisos.
- Dos períodos o equipo: no mezclar días de otra persona ni sumar aprobado/disfrutado al saldo restante.
- Intención de navegación: abrir el tipo correcto, consumir la intención sin reabrir al cerrar/volver y sin perder un formulario por navegación.
- Revisar/editar, archivos, red desconocida y refetch: conservar controles/valores/UUID y no permitir doble POST o cierre durante envío.
- No turnos/plantillas, nocturnos y móvil: explicar siguiente paso sin esconder campos ni convertir guardar borrador en publicar.

## Task 1: Navegación e Inicio

**Files:** `components/layout/{navigation,route-search,app-shell}.tsx/ts`, `features/dashboard/dashboard.tsx`, tests correspondientes y selectores pertinentes en E2E shell/dashboard/appearance/foundation.

**Interfaces:** NavigationItem admite `description?`/`keywords?` para búsqueda, sin nuevos destinos. CTA de vacaciones: `/solicitudes` con `search: {create:'VACATION'}`. Gestores: Calendario se presenta como Asignar turnos; lectores Mis horarios. Turnos: Plantillas de turno; Vacaciones: Días disponibles; rutas intactas.

- [x] Probar descubrimiento por tareas y alias, filtro de autorización y entradas por rol.
- [x] Implementar navegación clara e Inicio con accesos explícitos y ayudas específicas; vinculación ausente explicada con enlace autorizado a Empleados.
- [x] Conservar métricas/definiciones/detalles; evitar enlaces ambiguos entre solicitar y administrar días.
- [x] Validar pruebas locales y selectores de flujos afectados, sin eliminar aserciones de negocio.

## Task 2: Asignar turnos y comprender plantillas

**Files:** `features/planning/{calendar-page,shifts-page,planning-editor}.tsx`, `steps-pages.test.tsx`, `tests/e2e/steps10-12.spec.ts`.

**Interfaces:** conservar handlers/payloads. PlanningEditor puede admitir `description?` opcional. Asignar turno guarda borrador; publicación sigue siendo acción/confirmación aparte. Enlaces a `/turnos` y `/calendario` sin crear rutas.

- [x] Probar acción Asignar turno y guía para publicar; distinguir plantilla/asignación.
- [x] Implementar títulos, vacío específico, guía de tres pasos, editor agrupado y resumen de plantilla elegida; mostrar solo horarios/modalidad/categoría de datos recibidos.
- [x] Mantener filtros, rango, mes/agenda, guardias, festivos, centro y edición/movimiento/cancelación.
- [x] Validar conflictos, borrador, pending/foco y E2E adaptado preservando snapshots/persistencia.

## Task 3: Intención tipada y vacaciones

**Files:** `lib/request-intent.ts` + tests, `app/router.ts`, `features/requests/vacation-page.tsx`, componente de tarjeta de días si ayuda, pruebas nuevas.

**Interfaces:** `requestIntentSearch(input): {create?:'VACATION'|'PERMISSION'|'JUSTIFICATION';period?:number}`; ignora valores inválidos, período solo1–100 para VACATION. La intención solo preselecciona una UI, no autoriza ni envía.

- [x] Probar parser y estado personal/equipo con cifras distintas y período cero/ausente/error.
- [x] Implementar Mis días/Equipo solo según alcance, filtro de empleado y claridad de acciones administrativas.
- [x] Destacar disponible y en revisión; explicar saldo y uso aprobado/disfrutado sin sumas falsas. Mantener todos los movimientos y cifras originales.
- [x] Enlazar Solicitar vacaciones, con período opcional y requisitos claros; las concesiones/ajustes existentes mantienen contrato y motivo.
- [x] Verificar aislamiento de datos, estados y enlaces/editores.

## Task 4: Solicitud guiada y revisión antes de enviar

**Files:** `features/requests/requests-pages.tsx`, extraer `create-request.tsx`/`request-review.tsx` si facilita lectura, controles compartidos solo si necesario, pruebas requests y E2E requests.

**Interfaces:** consume intención por `validateSearch`. Inicializar estado desde intención al montar y quitarla con replace en efecto sin modificar el estado de edición; entradas en la misma pantalla son botones. CreateRequest admite tipo/período inicial. No UUID hasta enviar desde revisión; los reintentos unknown mantienen el mismo payload/UUID.

- [x] RED de llegada desde Vacaciones, revisión sin POST, editar conserva campos/archivos, cierre/volver no reabre.
- [x] Implementar entradas por tarea, vacío con siguiente acción y aviso de vinculación con solución por rol.
- [x] Reordenar tipo/período/fechas/motivo; feedback de carga/error necesario sin refrescos de éxito dentro del panel.
- [x] Construir payload validado al revisar, conservar formulario montado, resumen accesible y enviar solo al confirmar. Mantener restricciones por tipo, adjuntos y privacidad.
- [x] Adaptar pruebas existentes para el nuevo paso; conservar 403/409, idempotencia, pending/refetch, descarte reversible y evidencia.

## Task 5: Cierre integrado

**Files:** documentación `docs/verification/2026-11-19-ux-clarity/`, E2E de descubrimiento/claridad y reparación de pruebas pertinentes.

- [x] Integrar revisiones de ambos dominios y comprobar todos los requisitos de la spec, no solo tests verdes.
- [x] Ejecutar `pnpm check`, PostgreSQL y E2E serial con flujos reales en `_test`; conservar API/payload/snapshots/CSRF/privacidad.
- [x] Capturar y revisar los pasos antes/después en móvil/escritorio, ambos temas; reflow de rutas afectadas y navegación general.
- [x] Compilar producción y medir estabilidad de carga/recursos contra snapshot, documentar método y límites reales.
- [x] Dejar app de desarrollo respondiendo para revisión, reporte conciso con enlaces. Marcar objetivo completo únicamente con evidencia del resultado.
