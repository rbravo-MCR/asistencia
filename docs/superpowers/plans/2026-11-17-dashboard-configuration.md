# Dashboard y configuración administrativa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Entregar el punto 1 aprobado con dashboard por alcance, configuración central y diagnóstico accionable.

**Architecture:** Consultas públicas por módulo y composición de lectura en `dashboard`; contratos TypeBox compartidos. React reutiliza páginas existentes, con configuración de asistencia dedicada y filtros URL.

**Tech Stack:** TypeScript, Fastify, Drizzle, PostgreSQL, React, TanStack Router/Query, Vitest y Playwright existentes.

**Spec:** `docs/superpowers/specs/2026-11-17-dashboard-configuration-design.md` — aprobado por el usuario en esta conversación.

## Global Constraints

- Sin dependencias nuevas, políticas empresariales, saldos inventados, app móvil ni despliegue.
- Conservar permisos, CSRF, historial y el árbol previo sin seguimiento; no crear commit inicial ni worktree vacío sin el trabajo existente.
- Fecha/hora del servidor y `APP_TIME_ZONE`; consultas sin efectos de negocio.
- Pruebas de persistencia exclusivamente PostgreSQL `_test`.

## Review Focus

- Jefe/suplente/director revocados y superior sin jefatura: alcance vigente y acciones exactas.
- Medianoche/nocturnos y turnos anteriores a activación: no inventar faltas o pendientes históricos.
- Motivo sin resolución y ausencias aprobadas: mantener originales y distinguir resolución.
- Más de 100 avisos, períodos de vacaciones separados y consulta fallida: totales exactos, sin ceros engañosos.
- Configuración incompleta: advertencias accionables, sin alterar datos ni revelar detalles a empleados.

### Task 1: Consultas, contratos y endpoints

**Files:** crear `packages/contracts/src/dashboard.ts`, `apps/api/src/modules/dashboard/{index,routes,service}.ts`, consultas públicas de diagnóstico bajo empleados, turnos y ubicaciones; modificar composición bootstrap, auditoría y servicios de asistencia/solicitudes; crear `apps/api/tests/dashboard.integration.test.ts`.

**Interfaces:** `createDashboardService(...).get(scope)` devuelve `DashboardView`; `.configuration(scope)` devuelve `ConfigurationStatusView`. `GET /api/dashboard` autenticado; `GET /api/configuration/status` exige ADMIN/HR. Ambos no-store.

- [x] Crear pruebas RED de HTTP401/403, alcance, resumen sin faltas inferidas, avisos >100 y diagnóstico sin mutaciones.
- [x] Ejecutar pruebas dirigidas y observar fallo por endpoints faltantes.
- [x] Implementar contratos, composición y consultas públicas; reutilizar autoridad y saldos existentes.
- [x] Ampliar pruebas de nocturnos, activación, resolución, suplentes/superior y cadena completa/incompleta.
- [x] Ejecutar suite dirigida hasta GREEN.

### Task 2: Dashboard, configuración y navegación

**Files:** crear `apps/web/src/features/dashboard/` y `configuration/`; extraer formulario `attendance-policy.tsx`; modificar inicio, router/layout y filtros calendario/asistencia; pruebas UI.

**Interfaces:** consume contratos Task 1 y sesión vigente. Rutas `/configuracion` y `/configuracion/asistencia`; dashboard en `/` con bienvenida pública conservada. Fechas URL `from`/`to` validadas.

- [x] Crear pruebas UI RED de rol, vacío/error/reintento, indicadores, enlaces y política.
- [x] Implementar componentes adaptables con detalle autorizado y navegación compatible.
- [x] Ejecutar pruebas UI y typecheck hasta GREEN.

### Task 3: Recorridos reales, revisión y documentación

**Files:** crear `tests/e2e/dashboard.spec.ts`, `docs/api/DASHBOARD.md` y evidencia; actualizar README, desarrollo y hoja de ruta.

- [x] Probar dashboard empleado/ADMIN/HR, configuración y política guardada/recargada con sesión real en escritorio/móvil.
- [x] Ejecutar `pnpm check`, `pnpm test:integration` y Playwright directo; revisar capturas.
- [x] Revisión independiente del cambio completo, corregir hallazgos con regresión RED→GREEN.
- [x] Registrar resultados reales y límites; marcar etapa 17 únicamente tras verificar.

## Ejecución

La petición original y la aprobación autorizan implementar y verificar en esta sesión. Ejecución directa, sin otra solicitud de aprobación para pasos reversibles dentro del alcance. Sin commits: el repositorio aún no tiene historial y todos sus archivos anteriores están sin seguimiento.
