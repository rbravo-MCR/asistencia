# Etapas 14–15 Implementation Plan

**Goal:** Implementar aprobaciones, vacaciones, permisos y justificaciones con saldos trazables y evidencias privadas.
**Spec:** `docs/superpowers/specs/2026-11-13-approvals-leave-design.md`.
**Architecture:** Módulo requests transaccional integrado con organización, asistencia y planificación.
**Tech Stack:** Stack fijado actual, sin nuevas dependencias.

Autorizada ejecución de agentes en paralelo por backend y frontend independientes; la raíz integra, verifica E2E y coordina revisión. Sin staging/commits/push/publicación.

- [x] Backend: contratos, dominio y esquema `requests`, migración, servicios/rutas y pruebas PostgreSQL RED→GREEN. Revalidar permisos/bloqueos, idempotencia y saldos.
- [x] Frontend: solicitudes, aprobaciones, saldos y configuración con contratos compartidos; pruebas UI RED→GREEN.
- [x] Integración raíz: bootstrap, schema registry, router/nav, asistencia/planificación y pruebas de integración; no alterar eventos originales.
- [x] E2E: flujo real empleado → jefe → director, saldo/reserva, evidencia/privacidad y cancelación en escritorio/móvil.
- [x] Revisión independiente, corrección de hallazgos, suites completas, migración de desarrollo y documentación/evidencia final.

## Review Focus

- Reasignaciones/inactivaciones durante aprobación no conservan autorización obsoleta.
- Solicitudes concurrentes no exceden saldo; rechazo/retiro/cancelación no duplican crédito.
- Motivos/evidencias no se filtran por auditoría, notificaciones o descarga ajena.
- Permiso parcial no oculta falta total; marcas/incidencias originales permanecen.
- Calendario civil, aniversarios bisiestos y reservas cruzando períodos mantienen trazabilidad.

## Cierre local 2026-11-13

162 unitarias/UI, 126 PostgreSQL y 26 E2E: **314 pruebas aprobadas**. Lint, modularidad, formato, tipos y build correctos; API compilada inicia/responde y cierra con código 0. Migraciones 0008/0009 aplicadas/repetidas en desarrollo sin datos de demostración. Revisión independiente, correcciones y decisiones en `docs/verification/2026-11-13-approvals-leave.md`.

Siguiente etapa: 16, aplicación móvil. Antes del uso operativo, configurar responsables, política interna y concesiones de saldo; no se generaron políticas empresariales ni saldos históricos no confirmados.
