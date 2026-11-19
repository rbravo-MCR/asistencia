# Departamentos reference Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, con revisión independiente de lectura al cierre. Steps use checkbox syntax.

**Goal:** Establecer Departamentos como referencia visual y funcional, deteniendo la expansión a otros módulos.
**Architecture:** DepartmentsScreen orquesta query/estado; DepartmentForm conserva writes/validación dentro de drawer; DepartmentList presenta tabla; DepartmentActions compone DropdownMenu; confirmación AlertDialog separada.
**Tech Stack:** React, TanStack Query/Router, Radix, Tailwind y lucide existentes.
**Spec:** docs/superpowers/specs/2026-11-18-departments-reference.md

## Global Constraints

Sin backend/contratos/dependencias/.env o datos de relleno en desarrollo. Conservar capacidades, reglas, CSRF, NFC/trim/Unicode y errores de resultado desconocido. Árbol sin HEAD: snapshot antes de modificar, sin commit inicial indiscriminado. No propagar diseño a otros módulos antes de la revisión del usuario.

## Review Focus

Transición menú→drawer y retorno de foco; filtros que excluyen fila tras guardar; nombre largo a 320 px; cierre dirty y pending; duplicado/error de red sin pérdida de texto; borrado con referencias; perfil sin permisos; glass con alto contraste/reducción de efectos.

### Task 1: Referencia previa y pruebas de aceptación

Files: tests/e2e/departments.spec.ts; nuevo departments-design.spec.ts; departments-screen.test.tsx; evidencia.

- [x] Guardar snapshot/hash y capturas previas con fixtures `_test`.
- [x] Pruebas RED de ausencia de formulario permanente, drawer, búsqueda y menú; adaptar flujo CRUD sin quitar assertions de API/PostgreSQL.

### Task 2: Implementación visual y funcional

Files: features/departments/{departments-screen,department-list,department-form,department-actions,department-delete-dialog}.tsx; styles.css y clase scoped de scroll en sidebar.
Interfaces: List recibe items y callbacks actuales; Form recibe department/csrf/onSaved/onCancel y posee drawer; menú recibe department y callbacks, restaura foco al trigger antes de abrir superficie; DeleteDialog recibe entidad/error/pending/onConfirm/onCancel.

- [x] Implementar página y tabla sin Card exterior, búsqueda local sin API nueva.
- [x] Crear/editar en SidePanel, conservación de errores y guardas de borrador; resultado confirmado con notice.
- [x] Menú contextual, AlertDialog de borrado, foco y permisos actuales.
- [x] Scrollbar y glass flotante con fallback sin modificar otros módulos.

### Task 3: Revisión y evidencia para decisión del usuario

- [x] Unit/UI, integración PostgreSQL y E2E completos aplicables; pnpm check.
- [x] Capturas Playwright claro/oscuro, desktop/móvil, drawer/menú/confirmación y estados; revisarlas visualmente.
- [x] Medir bundle y carga sobre producción, verificar fuentes protegidas y limpieza de fixtures.
- [x] Informe y enlaces a capturas. Detenerse en esta referencia: no continuar con otros módulos.

Cierre técnico: [evidencia](../../verification/2026-11-18-departments-reference/README.md). La aceptación visual del usuario sigue pendiente y la expansión permanece detenida.
