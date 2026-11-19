# Pruebas y regresión frontend

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Preparación

Leer `docs/DEVELOPMENT.md` y `docs/AGENTS.md`. Entorno aislado sin datos reales. Usar versiones del repo y `pnpm install --frozen-lockfile`. Configurar `.env` local a partir de ejemplo, nunca publicar secretos. No ejecutar migraciones sobre producción. Capturar baseline de pruebas y vistas antes de cambios.

## Comandos existentes

```bash
pnpm check
pnpm db:test:up
pnpm test:integration
pnpm test:e2e
```

`check` incluye lint, boundaries, format:check, typecheck, Vitest y build. Integración requiere `TEST_DATABASE_URL` y PostgreSQL de prueba; E2E sigue setup documentado y Chromium de Playwright. No afirmar éxito sin salida real. No modificar tests para ocultar regresiones; actualizar selectores cuando cambia UX y preservar aserciones de negocio.

## Cobertura mínima

| Suite existente                                     | Regresión requerida                                           |
| --------------------------------------------------- | ------------------------------------------------------------- |
| `base.spec.ts`, `departments.spec.ts`               | navegación, CRUD y layout                                     |
| `identity-employees.spec.ts`, `super-admin.spec.ts` | sesión, alcance, cuentas protegidas                           |
| `attendance.spec.ts`                                | ENTRY/EXIT, GPS/home, motivos, rechazo, nocturno, reintentos  |
| `steps10-12.spec.ts`                                | turnos, borradores, publicación, ubicación, avisos/auditoría  |
| `requests.spec.ts`                                  | vacaciones, permisos, saldo y aprobación/retirada/cancelación |
| `dashboard.spec.ts`                                 | métricas, drilldown, visibilidad y diagnóstico                |

Añadir pruebas de UI al lado de cada feature; Testing Library por rol/nombre. Simular red lenta, timeout, 403, 409, respuesta HTTP 200 rechazada y sesión revocada. Probar separación de caches entre usuarios. Verificar selector de fecha inválida y rango máximo. No mockear todo el backend como sustituto de integración.

## Visual y accesibilidad

Capturas reproducibles Playwright con datos ficticios, viewport fijo, fuente cargada, fecha controlada y animaciones reducidas. Login, dashboard, móvil asistencia, calendario, aprobaciones, error/vacío en claro/oscuro. Revisar diffs, no aceptar snapshots automáticamente. Matriz responsive de 08, teclado/lector de pantalla de 09. Prueba física GPS aparte.

## Evidencia

Por fase: commit, comando, código salida, totales, captura, navegador/dispositivo, defectos pendientes. Si ambiente impide una prueba, registrar bloqueo y no marcarla aprobada. Los resultados de este documento son requisitos, no pruebas ejecutadas.
