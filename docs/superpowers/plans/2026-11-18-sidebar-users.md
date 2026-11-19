# Sidebar y usuarios Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Steps use checkbox syntax. Sin subagentes para esta corrección acotada.

**Goal:** Navegación lateral ordenada y gestión de usuarios con diseño y jerarquía reales.
**Architecture:** Configuración tipada de navegación → AppShell/Sidebar; panel reutilizable Radix; directorio de usuarios separado de formulario y orquestación de datos existente.
**Tech Stack:** React, TanStack Router/Query, Tailwind, Radix, lucide, Playwright/Vitest instalados.
**Spec:** docs/superpowers/specs/2026-11-18-sidebar-users.md

## Global Constraints

Sin backend/contratos/dependencias/.env o datos empresariales de relleno. Conservar roles, validaciones, CSRF, recovery, revocación de sesión y 22 rutas. Árbol sin HEAD: conservar snapshot y trabajar en lugar, sin commit inicial indiscriminado.

## Review Focus

Acceso por URL sin permiso; menú móvil oculto no duplicando foco; retorno del foco desde panel; filtros sin resultados; errores de guardado sin pérdida de texto; SUPER_ADMIN protegido; cierre con formulario sucio; estado pending evitando doble envío.

### Task 1: Shell y panel accesible

Files: app/root-layout.tsx; components/layout/{navigation,app-shell,sidebar}.tsx; components/ui/side-panel.tsx; styles.css; tests/e2e/shell-users.spec.ts.
Interfaces: NavigationItem con path tipado/icon/label/permission; AppShell consume sesión existente y children; SidePanel controlled open/onOpenChange + title/description.

- [x] Capturar menú y Usuarios anteriores, guardar hashes de fuentes protegidas.
- [x] Escribir pruebas de sidebar, selección, colapso, móvil Escape/foco y permisos; verificar RED.
- [x] Implementar sidebar por capacidades, header y panel Radix; comprobar GREEN.

### Task 2: Directorio de usuarios

Files: features/identity/{users-page,user-form,users-directory}.tsx; super-admin.test.tsx; tests/e2e/super-admin.spec.ts; shell-users.spec.ts.
Interfaces: UsersDirectory consume UserView[], loading/error y callbacks onEdit/onRecovery; UserForm consume user/csrf/isSuperAdmin/onDone. Las mutaciones conservan endpoints/schemas e invalidación de sesión.

- [x] Pruebas RED de búsqueda/filtros y panel de creación/edición con permisos.
- [x] Implementar directorio, indicadores de datos cargados, toolbar y formulario lateral con errores/pending y protección de cambios.
- [x] Verificar teclado, overflow320, estados vacíos, contraste claro/oscuro y protección SUPER_ADMIN.

### Task 3: Evidencia y entrega

- [x] Ejecutar pnpm check, integración PostgreSQL y E2E; corregir regresiones.
- [x] Capturas reales, verificación manual del resultado y peso del bundle. Conservar servidor local para revisión.
- [x] Documentar resultados, límites y fuentes protegidas; actualizar avance del plan premium sin afirmar cierre de todos sus puntos.

Revisión: se usó un revisor independiente solo de lectura conforme a requesting-code-review, sin delegar implementación. Se corrigieron Atrás/recarga con borrador y retorno de foco al desaparecer una fila; se añadió regresión de acceso público. [Entrega y límites](../../verification/2026-11-18-sidebar-users/README.md).
