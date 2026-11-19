# Aprobación definitiva de jefatura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Aplicar la decisión autorizada de aprobación laboral definitiva de jefatura.

**Architecture:** Flujo guardado por solicitud, predeterminado HEAD_ONLY; historial HEAD_DIRECTOR preservado. Mismos servicios transaccionales, contratos compartidos y UI existentes.

**Tech Stack:** TypeScript/Fastify/Drizzle/PostgreSQL/React/Vitest/Playwright existentes, sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-11-17-head-final-approval-design.md`.

## Global Constraints

- La confirmación del usuario sustituye la anterior regla jefe/director para solicitudes nuevas.
- No autoaprobación, bypass por ADMIN/HR/CEO ni modificaciones de marcajes originales.
- Efectos y auditoría atómicos e idempotentes; evidencias privadas.
- PostgreSQL `_test` para pruebas; no datos de demostración en desarrollo.
- Conservar árbol previo sin seguimiento y cambios ajenos; sin commit inicial, push o despliegue.

## Review Focus

- Nueva aprobación sin director y rechazo de intentos de firma global sin jefatura.
- Cancelación iniciada mientras espera decisión: sin devolución de días disfrutados.
- Reintentos concurrentes: un solo consumo, devolución y decisión.
- Autoridad revocada/superior inactivo y peticiones de jefes: sin autoaprobación.
- Migración e historial previo: sin aprobaciones automáticas ni pérdida de pasos.

### Task 1: Persistencia y servicio

**Files:** `requests/{schema,service}.ts`, contratos `requests.ts`, migración/snapshot Drizzle, `head-final.integration.test.ts`, fixtures de regresiones históricas.
**Interfaces:** `LeaveRequestView.approvalFlow`; constructor `createRequestService` con versión de creación confiable opcional, HTTP HEAD_ONLY por defecto.

- [x] Crear y ejecutar pruebas RED de aprobación sin director y efectos inmediatos.
- [x] Implementar columna, migración conservadora, selección de paso final y diagnóstico.
- [x] Probar cancelación, concurrencia, rechazo/retiro, justificación y migración histórica.
- [x] Ejecutar suite PostgreSQL dirigida hasta GREEN.

### Task 2: UI, E2E y contratos

**Files:** páginas/lista de solicitudes y pruebas UI; `tests/e2e/requests.spec.ts`; diagnóstico dashboard y fixtures.
**Interfaces:** contratos Task 1, acciones `canHeadDecide`/`canDirectorDecide` calculadas por servidor.

- [x] Actualizar pruebas para aprobación definitiva, historial versionado y conservación de acciones autorizadas.
- [x] Actualizar pantallas y recorridos reales de vacaciones/cancelación, sin firma del CEO.
- [x] Ejecutar tipos y pruebas UI; corregir causas verificadas.

### Task 3: Cierre

- [x] Ejecutar `pnpm check`, suite PostgreSQL y Playwright completo; verificar salidas 0.
- [x] Revisión independiente y corrección de hallazgos con regresión.
- [x] Aplicar/repetir migración de desarrollo y verificar datos sin solicitudes ficticias.
- [x] Actualizar reglas vigentes, API, guías y evidencia de resultados.

Ejecución directa autorizada por la confirmación del usuario. Sin otra aprobación para cambios reversibles del alcance ya definido.
