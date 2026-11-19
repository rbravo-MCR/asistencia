# Cierre operativo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Aplicar configuración autorizada y completar preparación verificable para operación.
**Architecture:** Servicios existentes para configuración, utilidades locales aisladas para backup y validación de origen en bootstrap.
**Tech Stack:** TypeScript, Fastify, PostgreSQL18.6, Drizzle, React, Docker Compose; sin dependencias nuevas.
**Spec:** docs/superpowers/specs/2026-11-17-operational-readiness-design.md.

## Global Constraints

- Preservar credenciales, roles SUPER_ADMIN y jefaturas; HEAD_ONLY vigente.
- No inventar saldos, permisos, vigencias o SMTP; móvil al final.
- Pruebas en `_test`; backups privados fuera del repositorio.
- Checkout sin commits: conservar árbol, sin commit inicial ni worktree vacío.

## Review Focus

- Backup truncado/corrupto o archivo/manifest sustituido.
- Restore dirigido accidentalmente a base real.
- Lectura de política LFT y publicación repetida sin duplicar versiones.
- Origen HTTP en producción rompe cookies seguras o permite sesión insegura.
- Diagnóstico verde local no es certificación de producción.

### Task 1: respaldo y restauración aislada

**Files:** infrastructure/operations/backup.ts, bootstrap/backup.ts, tests/backup.test.ts, package scripts.
**Interfaces:** createBackup(root,directory) genera archivo+manifest; verifyBackup(root,path) verifica digest, restaura nombre generado `_test` y devuelve recuentos sin datos personales.

- [x] Probar RED checksum/formato de manifest y permisos del archivo.
- [x] Implementar backup custom y restauración solo en postgres-test temporal, sin shell dinámico ni credenciales por argumentos.
- [x] Ejecutar pruebas y backup/restore reales, conservar respaldo privado.

### Task 2: HTTPS y política confirmada

**Files:** bootstrap/config.ts, tests/config.test.ts, identity-http.integration.test.ts; config/policies/lft-vacation-entitlements.json; evidencia operativa.

- [x] Probar RED rechazo de HTTP en NODE_ENV production; implementar validación y ajustar fixture de producción a HTTPS.
- [x] Publicar LFT por savePolicy con idempotencia, actor real y verificación; conservar bancos/solicitudes/roles y responsabilidades.
- [ ] Resolver acciones de asistencia/jornadas/permisos únicamente con datos recibidos; registrar pendientes efectivos.

### Task 3: validación y cierre

- [x] Ejecutar check, integración y E2E completos; revisión independiente y corregir problemas importantes.
- [x] Revisar diagnóstico operativo actual, documentación de backup/correos/despliegue y límites.
- [x] Reportar cambios aplicados, resultado real, pendientes de datos y GO/NO-GO de producción.

Las acciones dependientes de datos siguen abiertas: no hubo respuesta a la consulta operativa durante la ejecución. Ver evidencia operational-readiness para resultados y pendientes.
