# Router y Departamentos: puntos 1–3 Implementation Plan

> **For agentic workers:** ejecutar con superpowers:executing-plans, pruebas RED→GREEN y revisión final.

**Goal:** navegación React y base de dominio/contratos/persistencia de Departamentos, sin endpoints ni CRUD web.
**Architecture:** TanStack Router por código; dominio puro y repositorio privado Drizzle expuesto mediante factory pública.
**Tech Stack:** stack existente; agregar únicamente @tanstack/react-router estable, exacto y compatible.
**Spec:** `docs/architecture/DEPARTMENTS_FOUNDATION.md` y puntos 1–3 autorizados en conversación.

## Global Constraints

- Mantener Fastify + Drizzle, TypeScript estricto y PostgreSQL real.
- Preservar todos los archivos anteriores; el repositorio aún no tiene commits.
- No implementar puntos 4–7 como funcionalidades adicionales; documentar y verificar este alcance sí es necesario.
- Sin datos semilla, campos organizacionales supuestos ni módulos simulados.

## Review Focus

- Nombres vacíos, Unicode, espacios y límite de 100 caracteres.
- Duplicados concurrentes y restricciones PostgreSQL, sin depender solo del chequeo de aplicación.
- UUID, timestamp y contratos de salida compatibles entre DB y futuro HTTP.
- 404, acceso directo, enlaces activos y atrás/adelante sin errores de SPA.
- Migración repetida conserva datos; ningún test toca desarrollo como fallback.

### Task 1: Router

Archivos: `apps/web/src/app/router.tsx`, layout y páginas, `main.tsx`, tests UI y E2E.
Interfaces: `createAppRouter(history?: RouterHistory)` produce router con `/`, `/estado` y fallback 404; QueryClient permanece en Providers.

- [x] Verificar versión estable e instalar exacta.
- [x] Escribir pruebas de navegación/404/acceso directo y observar fallo.
- [x] Implementar layout, rutas y recuperación de error sin CRUD de Departamentos.
- [x] Verificar pruebas y compilación.

### Task 2: Dominio y contratos

Archivos: `apps/api/src/modules/departments/domain/`, `packages/contracts/src/departments.ts`, tests.
Interfaces: `normalizeDepartmentName(name: string): string`; entidad `Department { id: string; name: string; createdAt: Date }`; entrada TypeBox y salidas ISO UTC.

- [x] Escribir pruebas de normalización, blancos, límite y contratos estrictos; observar fallo.
- [x] Implementar dominio puro, errores tipados y contratos públicos compartidos.
- [x] Ejecutar pruebas de dominio/contratos y límites arquitectónicos.

### Task 3: PostgreSQL y migración

Archivos: esquema y repositorio privados de módulo, índice público, registro global de esquemas y nueva migración.
Interfaces: `createDepartmentRepository(db)` expone `create({ name }): Promise<Department>` y `list(): Promise<Department[]>`.

- [x] Escribir integración PostgreSQL para crear/listar, duplicados concurrentes y checks de DB; observar fallo.
- [x] Implementar esquema e índice único, generar y revisar migración.
- [x] Implementar repositorio validado con errores de nombre duplicado.
- [x] Actualizar prueba anterior de historial para admitir nuevas migraciones y verificar idempotencia sin perder datos.
- [x] Verificar desde base nueva y sobre historial existente antes de migrar desarrollo.

### Task 4: Cierre del alcance

- [x] Ejecutar lint, formato, typecheck, unitarias/UI, integración y build.
- [x] Ejecutar navegador escritorio/móvil, revisar capturas y auditoría de producción.
- [x] Revisión independiente y corrección de hallazgos relacionados.
- [x] Documentar esquema, navegación y evidencia; reportar que no hay endpoints ni CRUD web.

## Registro

El usuario autorizó explícitamente esta ejecución. Decisiones menores se documentan en la especificación sin volver a pedir aprobación del alcance existente. Todos los archivos previos permanecen sin staging ni commits.

## Cierre

Puntos 1–3 completados. Revisión independiente con dos correcciones verificadas mediante RED→GREEN; sin hallazgos relacionados pendientes. Evidencia: `docs/verification/2026-11-12-router-departments-foundation.md`.

Resultado final: 50 unitarias/UI, 20 integraciones PostgreSQL y 4 E2E aprobadas. Migración aplicada y repetida en desarrollo, sin datos semilla. API y pantalla CRUD siguen pendientes. Sin staging ni commits.
