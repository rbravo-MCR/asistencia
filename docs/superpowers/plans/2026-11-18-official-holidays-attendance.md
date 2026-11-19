# Festivos y falta justificable — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Entregar festivos oficiales 2026–2027 y activar falta justificable administrativa desde 30 minutos después de entrada.
**Architecture:** Preset oficial y servicio transaccional de planificación; política/snapshot de asistencia y flujo existente de justificación.
**Tech Stack:** Fastify/Drizzle/PostgreSQL/React; sin dependencias nuevas.
**Spec:** docs/superpowers/specs/2026-11-18-official-holidays-attendance-design.md.

## Global Constraints

- Preservar credenciales, jefaturas, HEAD_ONLY, eventos originales y saldos. No publicar jornadas sin vigencia confirmada.
- Categoría administrativa del snapshot; no hora absoluta universal para turnos operativos.
- Fuentes LFT/INE verificadas; no calendarios escolares ni días empresariales.
- Checkout sin HEAD: trabajo en sitio conservando árbol; sin commit/staging/push.

## Review Focus

- Corte inclusivo y motivo no equivalen a rechazo ni a justificación aprobada.
- Política nueva no reevalúa controles previos.
- Salida omitida junto a falta tardía no debe perder su incidencia.
- Reintentos de carga y evaluaciones concurrentes no duplican datos.
- Datos oficiales no deben sobrescribir fechas conflictivas ni inferir años sin verificar.

### Task 1: falta justificable administrativa

**Files:** contracts/attendance.ts; attendance/domain.ts, schema.ts, service.ts; migración generada; attendance-policy.tsx; etiquetas attendance/requests/dashboard; pruebas attendance.test.ts, attendance.integration.test.ts y head-final.integration.test.ts.
**Interfaces:** `administrativeAbsenceMinutes?:number|null`, 1–1440 o null; `LATE_ABSENCE` incidencia/evaluación.

- [x] Escribir regresiones de límites/persistencia/justificación y observar RED.
- [x] Implementar campo nullable, snapshot y reglas; exponer control editable.
- [x] Comprobar GREEN y conservación histórica/idempotencia.

### Task 2: calendario oficial y aplicación

**Files:** planning/domain/official-holidays.ts, application/service.ts, index.ts; bootstrap/sync-holidays.ts; package scripts; pruebas oficiales y E2E.
**Interfaces:** `syncOfficialHolidays()` carga 15 fechas conocidas, devuelve creados/existentes; contexto de auditoría con actor autorizado y verificado.

- [x] Probar preset exacto y sincronización idempotente; observar RED y aplicar servicio/CLI.
- [x] Añadir recorrido web de política/corte justificable y festivos en ambos tamaños.
- [x] Ejecutar check, integración y E2E completos y revisión independiente; corregir hallazgos.
- [x] Respaldar, migrar/repetir, cargar calendario y publicar política30 mediante servicios reales auditados.
- [x] Registrar evidencia, comparar tablas protegidas y actualizar pendientes efectivos.

Cierre local: 399 pruebas (186 unitarias/UI, 175 PostgreSQL, 38 E2E) aprobadas. Calendario15 fechas y política v2 aplicados/repetidos sin duplicar, 27 tablas ajenas y política anterior conservadas. Ver `docs/verification/2026-11-18-official-holidays-attendance.md`.
