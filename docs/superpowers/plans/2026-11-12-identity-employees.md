# Identidad y empleados Implementation Plan

> **For agentic workers:** ejecutar por tareas con superpowers:executing-plans, RED→GREEN, revisión independiente y verificación final.

**Goal:** completar etapas 8 y 9 con autenticación y autorización real en API/web.
**Architecture:** identidad y empleados como módulos, servicios públicos, schemas de FK públicos y resolver de alcance inyectado.
**Tech Stack:** stack actual; cookie/rate-limit Fastify y Argon2id, PostgreSQL, React.
**Spec:** `docs/architecture/IDENTITY_EMPLOYEES.md` y etapas 8–9 autorizadas.

## Global Constraints

- Sin credenciales predeterminadas ni JWT/localStorage; primer ADMIN mediante CLI segura.
- PostgreSQL real, migraciones nuevas, nunca modificar migraciones aplicadas.
- Roles globales y responsabilidades organizacionales separados; sin autoampliar alcance.
- No avanzar a auditoría/notificaciones ni aprobaciones.

## Review Focus

- Cookie/CSRF/Origin, revocación y expiración; no filtrar hashes/tokens.
- Último administrador y cambios concurrentes.
- Lectura ajena, vinculación de cuentas, ciclos y fechas civiles inválidas.
- Suplencias finitas dependientes de titular vigente y ausencia de ampliación de permisos.
- Caché de otro usuario, rutas protegidas, persistencia y regresión Departamentos.

### Task 1: Contratos, dominio y schema

- [x] Escribir pruebas de validación, password y política de alcance; observar fallo.
- [x] Implementar contratos y dominios; schemas identidad/empleados con FK/índices/checks.
- [x] Generar/revisar migración nueva y probar PostgreSQL aislado.

### Task 2: Servicios y HTTP

- [x] Escribir integración de sesiones, usuarios, expediente y responsabilidades; observar fallo.
- [x] Implementar identidad, alcance, empleados/historial, guards y API protegida.
- [x] Proteger Departamentos; adaptar regresión con sesiones reales, no bypass de tests.
- [x] Implementar CLI inicial, recuperación administrativa y revocación.

### Task 3: Web

- [x] Implementar sesión, login/logout/recuperación/cuenta, rutas protegidas y limpieza de caché.
- [x] Usuarios, empleados y responsables con acciones según permisos, validación y estados.
- [x] Adaptar pruebas existentes y añadir cobertura de denegación, sesión y CRUD autorizado.

### Task 4: Cierre

- [x] PostgreSQL desde cero/repetición y migración de desarrollo sin cuentas inventadas.
- [x] Lint, formato, tipos, suites, E2E escritorio/móvil, build y auditoría.
- [x] Revisión independiente, correcciones verificadas y documentación/evidencia.
- [x] No staging, commits ni publicación; detenerse al completar etapas 8–9.

## Cierre

Etapas 8–9 completadas. Revisión independiente con dos hallazgos P2 corregidos y regresiones PostgreSQL RED→GREEN. Evidencia: `docs/verification/2026-11-12-identity-employees.md`.

Resultado: 88 unitarias/UI, 58 integraciones reales y 12 E2E aprobadas. Lint/formato/tipos/build/auditoría correctos. Migración 0002 aplicada y repetida; CLI y API compiladas verificadas. Sin cuentas predeterminadas ni avance al punto 10.
