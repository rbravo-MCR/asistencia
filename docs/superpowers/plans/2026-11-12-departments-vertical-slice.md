# Departamentos puntos 4–7 Implementation Plan

> **For agentic workers:** ejecutar por tareas con superpowers:executing-plans, pruebas RED→GREEN y revisión independiente final.

**Goal:** completar la primera funcionalidad vertical de Departamentos.
**Architecture:** dominio y repositorio existentes; casos de uso y adaptador HTTP; pantalla React sobre contratos compartidos.
**Tech Stack:** Fastify/Drizzle/PostgreSQL, React/TanStack Router/Query, shadcn/ui, React Hook Form y Zod.
**Spec:** `docs/architecture/DEPARTMENTS_VERTICAL_SLICE.md` y puntos 4–7 autorizados por el usuario.

## Global Constraints

- No modificar migraciones ya aplicadas ni trabajo ajeno.
- Sin autenticación, edición/eliminación ni otros módulos.
- API estricta: campos extra/tipos inválidos se rechazan; nombres normalizados por dominio.
- PostgreSQL real, pruebas exclusivamente en `_test`, sin SQLite ni datos de ejemplo en desarrollo.

## Review Focus

- Validación HTTP no debe coaccionar tipos ni borrar campos adicionales.
- Errores 400/409/500 y fechas deben cumplir contrato sin filtrar infraestructura.
- Fallos de GET/POST deben conservar una UI usable y evitar reenvíos automáticos.
- Crear debe persistir y sobrevivir a recarga real; rechazo no crea filas.
- Formularios deben aceptar 100 puntos de código después de NFC/trim y ser accesibles en móvil.

### Task 1: API y casos de uso

Archivos: `apps/api/src/modules/departments/application/`, `http/`, índice público y bootstrap.
Interfaces: casos `createDepartment(repository, input)` y `listDepartments(repository)`; `registerDepartmentRoutes(app, repository)`.

- [x] Escribir pruebas HTTP de PostgreSQL para creación/lista, tipos y extras, Unicode, duplicados/concurrencia y OpenAPI; observar fallo.
- [x] Implementar casos de uso y rutas con respuestas tipadas, serialización UTC y errores locales.
- [x] Componer rutas y configurar AJV estricto; ejecutar regresión API e integración.

### Task 2: Pantalla

Archivos: `apps/web/src/features/departments/`, página y registro de ruta/nav.
Interfaces: `fetchDepartments({signal})`, `postDepartment(input)` y contratos de respuesta existentes.

- [x] Verificar versiones e instalar dependencias exactas de formulario; añadir componentes shadcn.
- [x] Escribir pruebas de carga/vacío/error/reintento, validación, pendiente, duplicado y éxito; observar fallo.
- [x] Implementar cliente, formulario, lista accesible y actualización de TanStack Query sin retry de POST.
- [x] Incorporar `/departamentos`, navegación y enlace desde inicio; verificar pruebas y tipos.

### Task 3: Flujo completo y documentación

- [x] Añadir E2E real React/API/PostgreSQL con recarga, duplicado y verificación directa de BD, escritorio/móvil.
- [x] Ejecutar lint, formato, tipos, unitarias/UI, integración, E2E, build y auditoría.
- [x] Revisar capturas y ejecutar revisión independiente; corregir fallos con regresión.
- [x] Actualizar README, desarrollo, guía, endpoints y evidencia; comprobar runtime local compilado.

## Registro

El usuario autorizó ejecutar los puntos 4–7; se continúa directamente sobre el árbol existente. No hubo operaciones en el turno interrumpido previo. No crear commits, staging ni publicación para esta entrega.

## Cierre

Puntos 4–7 completados. Revisión independiente sin hallazgos P1/P2. Evidencia: `docs/verification/2026-11-12-departments-vertical-slice.md`.

Resultado: 64 unitarias/UI, 40 integraciones PostgreSQL y 6 E2E aprobadas; lint, formato, tipos, build y auditoría correctos. API compilada validada con PostgreSQL y cierre ordenado. Documentación y estado de fases actualizados. No se avanzó al punto 8.
