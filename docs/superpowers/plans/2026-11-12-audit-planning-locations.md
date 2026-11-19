# Etapas 10–12 Implementation Plan

> Implementación autorizada por la solicitud de continuar los pasos 10–12. Trabajo paralelo por módulos independientes, con integración y revisión final de la raíz.

**Goal:** Entregar auditoría/avisos internos, planificación de turnos y validación de ubicaciones en API y web.
**Architecture:** Monolito modular existente; transacciones explícitas, outbox PostgreSQL, snapshots publicados y comprobación GPS bajo demanda.
**Tech Stack:** Versiones ya fijadas de Fastify, Drizzle, PostgreSQL, React, TypeBox y Zod; sin dependencias nuevas.
**Spec:** `docs/superpowers/specs/2026-11-12-steps-10-12.md`.

- [x] Auditoría y contexto HTTP; integración transaccional de mutaciones existentes; outbox, worker y avisos propios.
- [x] Módulo Planning: plantillas, festivos, asignaciones, conflictos/medianoche, publicación/cancelación y alcance.
- [x] Módulo Locations: centros, autorizaciones, radio10m, precisión configurable y resultados persistidos de validación.
- [x] Frontend de auditoría, avisos, calendario/plantillas/festivos y ubicaciones; rutas y navegación.
- [x] Integrar esquemas/servicios y generar una migración revisada; aplicar en desarrollo y pruebas.
- [x] RED→GREEN por módulo, suite completa, PostgreSQL, E2E escritorio/móvil y revisión independiente.
- [x] Documentar contratos, configuración, evidencia, estado de etapas y límites reales.

## Restricciones

No mutar datos de otros proyectos ni probar entregas externas. Pruebas funcionales solo `_test`. No commits/push solicitados. Toda fila publicada conserva sus instantes y modalidad originales. No confiar en fecha/hora del dispositivo para validación GPS. Un aviso no puede consultarse ni marcarse leído por otro usuario.

## Resultado

129 unitarias/UI, 87 PostgreSQL y 18 E2E en escritorio/móvil correctos. Tres hallazgos P2 se corrigieron con regresiones RED→GREEN: correo en snapshots de auditoría, enlace incorrecto de avisos y consultas de centro ocultas al usuario sin gestión. Migraciones 0005–0006 aplicadas, inicialización única 4 plantillas/1 centro, radio10m. Avisos internos; sin SMTP ni marcajes/ aprobaciones. Evidencia: `docs/verification/2026-11-12-steps-10-12.md`.
