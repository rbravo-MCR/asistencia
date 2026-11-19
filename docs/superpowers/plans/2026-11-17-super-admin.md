# Superadministración técnica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Crear SUPER_ADMIN real y asignarlo a la cuenta autorizada, con protección frente a administradores inferiores.
**Architecture:** Enum aditivo, contratos compartidos, comprobación de actor activo desde contexto de auditoría y guardas transaccionales de identidad reutilizadas en empleados. HTTP resuelve actor, no acepta un actor suministrado por cliente.
**Tech Stack:** TypeScript, Drizzle/PostgreSQL, Fastify, React y suites existentes; sin dependencias nuevas.
**Spec:** `docs/superpowers/specs/2026-11-17-super-admin-design.md`.

## Global Constraints

- Mantener CEO como ADMIN y flujo laboral HEAD_ONLY sin bypass por rol técnico.
- Conservar credenciales y datos ajenos; revocar sesiones/tokens antiguos de la cuenta promovida.
- Probar exclusivamente en PostgreSQL `_test`; cambio real solo en cuenta explícitamente autorizada.
- Árbol previo sin seguimiento: sin commit inicial, worktree vacío, push ni despliegue.

## Review Focus

- ADMIN no escala añadiéndose SUPER_ADMIN ni modifica/recupera al propietario.
- Vías indirectas por expediente/desactivación/desvinculación y responsabilidades.
- Revocación de roles entre lectura y escritura; guardas bajo bloqueo compartido.
- Último SUPER activo protegido y recuperación local aún utilizable.
- Alcance global/configuración de SUPER sin conservar ADMIN como muleta; permisos laborales siguen separados.

### Task 1: Dominio, persistencia y servidor

**Files:** identidad contratos/domain/schema/service/access/routes; export público de contexto audit; guardas empleados; consultas requests/attendance; CLI recovery; migración 0011; pruebas.
**Interfaces:** `assertCanManageProtectedAccount(tx,id,nextRoles?,actorId?)` valida SUPER activo; autoridad normal usa contexto de petición. Rol SUPER_ADMIN incluido en gestión global. `issueRecovery(id,actorId?)` acepta actor explícito solo desde código de confianza.

- [x] Crear y observar prueba RED del nuevo rol.
- [x] Agregar enum/contratos/guards y migración.
- [x] Probar protecciones HTTP/servicios/PostgreSQL, rollback y última cuenta.
- [x] Ejecutar pruebas dirigidas hasta GREEN.

### Task 2: Interfaz y recorrido

**Files:** formularios/lista usuarios, cuenta, pruebas UI y E2E.

- [x] Mostrar Super administrador y ocultar acciones protegidas a ADMIN.
- [x] Probar edición/alta autorizada y rechazo real a roles inferiores.
- [x] Verificar tipos y pruebas UI.

### Task 3: Cierre y promoción

- [x] Ejecutar `pnpm check`, integración PostgreSQL y E2E completos; revisión independiente.
- [x] Aplicar/repetir migración; promover solo cuenta autorizada en transacción auditada.
- [x] Verificar rol real, credenciales conservadas, sesiones/tokens revocados y otras cuentas/jefaturas intactas.
- [x] Actualizar documentación y evidencia con resultados efectivos.

Ejecución directa autorizada por la petición de configurar superAdmin; no nueva aprobación para pasos reversibles del alcance definido.
