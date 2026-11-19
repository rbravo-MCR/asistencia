# Asistencia Implementation Plan

**Goal:** Completar etapa13 sin adelantar aprobaciones ni aplicación móvil.
**Spec:** `docs/superpowers/specs/2026-11-12-attendance.md`.
**Architecture:** Módulo de asistencia, eventos y motivos inmutables, evaluaciones/incidencias separadas, política versionada y transacciones con ubicaciones/auditoría/outbox.
**Tech Stack:** Stack fijado existente; sin dependencias nuevas.

- [x] Dominio/contratos/persistencia y pruebas RED→GREEN de bordes, idempotencia y concurrencia.
- [x] GPS reutilizado transaccionalmente según snapshot, política y controles contra cancelación del historial.
- [x] API con marcaje solo propio y consultas por alcance; incidencias/motivos pendientes de revisión.
- [x] Frontend de entrada/salida, historial, incidencias y configuración con estados de error/recuperación.
- [x] Integración de worker, migración/activación de política y pruebas PostgreSQL/E2E escritorio/móvil.
- [x] Revisión independiente, regresión completa y documentación/evidencia.

Cierre local del 2026-11-13: implementación existente revisada e integrada por la raíz, con revisión independiente y correcciones de regresión. Las casillas reflejan la verificación actual; el ciclo RED→GREEN observado se documenta para las correcciones de cierre, sin atribuirlo retrospectivamente al código previo. No commits/push/publicación ni datos de demostración en desarrollo.

Resultado: 142 unitarias/UI, 100 PostgreSQL y 22 E2E escritorio/móvil aprobadas. Ver `docs/verification/2026-11-13-attendance.md`. Siguiente etapa: 14, Aprobaciones. Márgenes iniciales propuestos 30/120 min configurables; validación operativa pendiente.
