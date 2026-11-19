# Permisos por horas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Configurar permisos por horas con goce modificable y aviso mínimo de 24 horas.
**Architecture:** Ampliar el catálogo y snapshot existentes; validar en servicio transaccional y exponer configuración en el panel.
**Tech Stack:** Fastify, Drizzle, PostgreSQL, React, TypeBox; sin dependencias nuevas.
**Spec:** docs/superpowers/specs/2026-11-18-hourly-permissions-design.md.

## Global Constraints

- HEAD_ONLY, motivo obligatorio, comprobante no obligatorio; preservar solicitudes, roles y saldos.
- Migración sin datos de negocio; configuración real mediante servicio y SUPER_ADMIN autorizado.
- Checkout existente sin commits: conservar archivos y trabajar en sitio, sin commit inicial.

## Review Focus

- Menos de 24 horas y omisión del intervalo no deben saltarse la regla.
- Cambiar goce no reescribe solicitudes anteriores.
- Campos nuevos omitidos al editar no borran restricciones previas.
- Fechas civiles deben respetar Mérida, incluida medianoche.
- Tipos por horas no admiten configuración contradictoria sin intervalos parciales.

### Task 1: catálogo, validación y panel

**Files:** contracts/requests.ts; requests/schema.ts, service.ts; migración generada; web/features/requests; requests.integration.test.ts, requests-pages.test.tsx.
**Interfaces:** `minimumNoticeHours` (entero 0–8760), `partialOnly` (boolean); snapshot de configuración en cada solicitud nueva.

- [x] Añadir pruebas PostgreSQL y UI y observar fallos por reglas ausentes.
- [x] Implementar contrato, columnas con valores históricos 0/false, validación transaccional y snapshots.
- [x] Exponer aviso mínimo e intervalo obligatorio en configuración y solicitud; goce sigue editable.
- [x] Ejecutar pruebas focalizadas y comprobar compatibilidad histórica.

### Task 2: configuración real y cierre

**Files:** config/policies/hourly-permissions.json, docs/api/REQUESTS.md, docs/verification/2026-11-18-hourly-permissions.md y estado operativo.
**Interfaces:** `savePermissionType(id,input,scope)` existente con actor real, configuración repetible sin versionar sin cambios.

- [x] Ejecutar check, integración y E2E completos; revisar y corregir hallazgos.
- [x] Respaldar, aplicar/repetir migración y configurar los dos tipos; comprobar persistencia y conservación de otros datos.
- [x] Documentar resultados reales y pendientes efectivos, sin declarar producción.

Cierre: 182 unitarias/UI, 169 PostgreSQL y 34 E2E = 385 pruebas aprobadas. Evidencia: `docs/verification/2026-11-18-hourly-permissions.md`.
