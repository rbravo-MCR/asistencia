# Inventario frontend previo al rediseño

Fecha: 18-11-2026. Fuente: código actual y contratos; baseline visual en `screenshots/` y datos medidos en `evidence/browser-baseline.json`.

## Rutas, acceso, operaciones y regresión

Las 22 rutas están declaradas en `apps/web/src/app/router.ts`. No hay guardas `beforeLoad` por ruta: `ProtectedPage` resuelve sesión/permisos en la composición de pantalla; el backend vuelve a autorizar cada consulta/escritura. S = sesión; O = `manageOrganization`; U = `manageUsers`. Los permisos O/U incluyen SUPER_ADMIN según sesión real, sin convertirlo en aprobador laboral.

| Ruta                        | Implementación bajo `apps/web/src/`                          | Acceso y operaciones actuales                                                                           | Pruebas existentes relevantes                                                      |
| --------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `/`                         | `pages/home-page.tsx`, `features/dashboard/dashboard.tsx`    | Bienvenida pública; con S, jornada/resumen/pendientes por alcance; lectura y enlaces                    | `dashboard.test.tsx`, `dashboard.spec.ts`, `base.spec.ts`                          |
| `/ingresar`                 | `features/identity/auth-pages.tsx`                           | Público; identificador o correo + contraseña; redirige sesión a inicio                                  | `form-schema.test.ts`, `session.test.tsx`, `identity-employees.spec.ts`            |
| `/recuperar`                | mismo archivo                                                | Público; código temporal + contraseña; no envío automático de correo                                    | `form-schema.test.ts`, integración identidad/CLI                                   |
| `/cuenta`                   | mismo archivo                                                | S; perfil, cambio de contraseña y logout                                                                | `session.test.tsx`, `identity-employees.spec.ts`                                   |
| `/departamentos`            | `pages/departments-page.tsx`, `features/departments/`        | S, lectura por alcance; O alta/edición/eliminación con referencias protegidas                           | `departments-screen.test.tsx`, `departments.spec.ts`                               |
| `/empleados`                | `features/employees/employees-page.tsx`                      | S, lectura por alcance; O expediente/contacto/vinculación/alta/edición/eliminación protegida            | `organization-pages.test.tsx`, `identity-employees.spec.ts`, `super-admin.spec.ts` |
| `/responsables`             | `features/employees/assignments-page.tsx`                    | S, historial por alcance; O titular, director, suplente y revocación                                    | `organization-pages.test.tsx`, `identity-employees.spec.ts`                        |
| `/usuarios`                 | `features/identity/users-page.tsx`                           | U; alta/edición/roles/estado y recovery; SUPER_ADMIN protegido                                          | `super-admin.test.tsx`, `super-admin.spec.ts`, integración identidad               |
| `/asistencia`               | `features/attendance/attendance-pages.tsx`                   | S; marcaje propio activo, selección de turno, GPS presencial, motivos, historial; O política/evaluación | `attendance-pages.test.tsx`, `attendance-policy.test.tsx`, `attendance.spec.ts`    |
| `/incidencias`              | mismo archivo                                                | S, rango/agrupación por turno y alcance, motivos propios, resolución separada                           | `attendance-pages.test.tsx`, `attendance.spec.ts`, integración asistencia          |
| `/calendario`               | `features/planning/calendar-page.tsx`                        | S, mes/agenda por alcance; O borrador, editar/mover con confirmación, publicar/cancelar                 | `steps-pages.test.tsx`, `steps10-12.spec.ts`, `official-holidays.spec.ts`          |
| `/turnos`                   | `features/planning/shifts-page.tsx`                          | O; plantillas versionadas y festivos, crear/editar/eliminar sujeto a referencias                        | `steps-pages.test.tsx`, `steps10-12.spec.ts`, `official-holidays.spec.ts`          |
| `/ubicaciones`              | `features/locations/locations-page.tsx`                      | S, consulta/validación según alcance; O centros/autorizaciones/vigencias y revocación                   | `steps-pages.test.tsx`, `steps10-12.spec.ts`, integración ubicaciones              |
| `/solicitudes`              | `features/requests/requests-pages.tsx`, `request-list.tsx`   | S; enviar propios de empleado vinculado, evidencias privadas, retirar/cancelar y reintentar UUID        | `requests-pages.test.tsx`, `evidence.test.ts`, `requests.spec.ts`                  |
| `/aprobaciones`             | mismos archivos                                              | S; pendientes e historial por alcance; decidir solo `canHeadDecide`/`canDirectorDecide` de API          | `requests-pages.test.tsx`, `requests.spec.ts`, integración HEAD_ONLY               |
| `/vacaciones`               | `features/requests/vacation-page.tsx`                        | S, períodos/movimientos por alcance; O concesión y ajuste con motivo                                    | `requests-pages.test.tsx`, `requests.spec.ts`                                      |
| `/politicas-ausencias`      | `features/requests/policies-page.tsx`                        | O; política versionada y catálogo: goce, evidencia, horas y aviso mínimo                                | `requests-pages.test.tsx`, `requests.spec.ts`, integración solicitudes             |
| `/avisos`                   | `features/notifications/notifications-page.tsx`              | S, bandeja propia; marcar uno/todos, enlaces internos                                                   | `steps-pages.test.tsx`, `steps10-12.spec.ts`                                       |
| `/auditoria`                | `features/audit/audit-page.tsx`                              | U; filtros, paginación real 50, detalle antes/después sanitizado; solo lectura                          | `steps-pages.test.tsx`, `steps10-12.spec.ts`, integración auditoría                |
| `/configuracion`            | `features/configuration/configuration-page.tsx`              | O; diagnóstico de lectura y enlaces; acceso/usuarios/auditoría solo U                                   | `dashboard.test.tsx`, `dashboard.spec.ts`                                          |
| `/configuracion/asistencia` | `features/attendance/attendance-policy.tsx`                  | O; política versionada, incluye corte administrativo nullable                                           | `attendance-policy.test.tsx`, `dashboard.spec.ts`, `attendance.spec.ts`            |
| `/estado`                   | `pages/system-page.tsx`, `features/system/system-status.tsx` | Público; readiness API/PostgreSQL, reintento y fecha de consulta                                        | `system-status.test.tsx`, `router.test.tsx`, `base.spec.ts`                        |

También existen página 404 y error de ruta en `pages/not-found-page.tsx` y `pages/route-error-page.tsx`. Las capturas de acceso denegado y de sesión anónima permiten distinguir protección del layout de la protección del servidor.

## Componentes, estado y dependencias

- Seis primitivas en `components/ui`: Button (CVA), Input, Label, Badge, Card y Table. Radix y utilidades ya disponibles; no hay biblioteca paralela.
- Layout: `app/root-layout.tsx`, header blanco con navegación envuelta, logo WebP, enlace de salto y pie. Contenido centrado máximo `max-w-5xl`.
- Helpers compartidos hoy dentro de features: `identity/form-fields.tsx` (Page, Field, FormError, panel/select), `employees/query-feedback.tsx`, `planning/controls.tsx`, `planning/use-write.ts`, `requests/controls.tsx`, `requests/common.ts`.
- Query/servidor: TanStack Query; contexto de sesión; invalidación dashboard/configuración en `app/providers.tsx`; estado de formularios local y RHF/Zod. `lib/api.ts` valida respuestas TypeBox, envía CSRF y cookies, usa `no-store`, aborta a 10 s y dispara expiración/invalidez de datos.
- URL: validación de fechas civiles y 1–93 días en `lib/date-range-search.ts` para asistencia/incidencias/calendario. Otros filtros viven mayormente en estado local; auditoría tiene paginación real.
- Estilos: Tailwind 4 `@theme inline`; paleta anterior y varias superficies blancas fijas en componentes/features. No tema oscuro, Google Sans, sidebar, barra móvil, breadcrumbs, CommandPalette ni GlassSurface implementados.
- Sin TanStack Table, Motion, Recharts o dnd-kit declarados. Arrastre HTML nativo actual. No nuevo cliente HTTP, Redux, PWA, service worker ni aplicación móvil en el alcance.
- `home-page.tsx` carga dashboard con importación dinámica; el resto del router importa features anticipadamente. El bundle real está en `evidence/bundle.json`.
- Restricciones de dependencias: `.dependency-cruiser.cjs`; sin ciclos, sin internos backend desde web, contratos independientes. No prohíbe actualmente todo import cruzado privado entre features web: la dirección propuesta por guía 11 es objetivo de diseño adicional.

## Inventario de estados

| Patrón o flujo          | Estados actuales comprobados en código/pruebas                                                                                                | Cuidado al rediseñar                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Sesión / ProtectedPage  | verificando, fallo con reintento, anónimo a login, permiso denegado, autenticado                                                              | No ocultar toda la app por mutación local; limpiar datos al cambiar usuario                  |
| QueryFeedback           | cargando, error con reintento, vacío contextual, actualizar, refresco deshabilitado                                                           | No tratar error como vacío ni perder los datos del formulario                                |
| Login/recovery/cuenta   | error de validación y servidor, pending, rate limit, recovery completado, logout fallido                                                      | Permitir pegar/autocompletar; secreto temporal sin persistencia                              |
| CRUD organización       | consulta, vacío, creando/editando/eliminando, confirmación, error de duplicado/referencias, éxito                                             | Conservar permisos/cuentas protegidas y feedback asociado a la entidad                       |
| Asistencia              | sin empleado, sin turnos, turno elegido, pending GPS/envío, aceptado, incidencia/rechazo, motivo requerido, resultado desconocido y reintento | Distinguir aceptación de incidencia/rechazo en mensaje principal; acciones según estado real |
| Calendario              | mes/intervalo y día, agenda vacía, borrador editable, movimiento por confirmar, publicado, cancelado, error/conflicto                         | No hacer editables publicados; formulario alternativo al arrastre                            |
| Solicitudes             | por tipo, evidencia inválida, política/saldo ausentes, validación de horas, pending, desconocido/reintento, historial y decisiones            | Mantener snapshot de restricciones y revalidación de autoridad                               |
| Vacaciones              | sin períodos, período/saldo/movimientos, concesión/ajuste pendiente/error/éxito                                                               | No fabricar disponible a partir de antigüedad                                                |
| Configuración           | carga/error, advertencias e información, enlaces por capacidad                                                                                | Diagnóstico no modifica negocio ni acredita producción                                       |
| Estado técnico / router | disponible, no disponible, consulta en curso, reintento, 404/error de ruta                                                                    | Sin detalles de conexión o secretos                                                          |

La tabla registra existencia y cobertura; no afirma que cada combinación visual haya sido fotografiada. Capturas principales usan datos sintéticos de `_test`, con vacíos reales; suites E2E cubren flujos con registros y mutaciones. Los estados de carga/error de dashboard se capturan mediante fallos controlados de red identificados como tales.

## Pruebas y cobertura que se conservan

16 archivos de pruebas web, 14 archivos unitarios API y 17 archivos de integración PostgreSQL; 9 suites E2E más fixtures. Las cantidades de pruebas ejecutadas y códigos de salida están en el informe de cierre.

La regresión existente incluye identidad/sesión, cuentas SUPER_ADMIN, CRUD/alcance, calendario/turnos/centros/avisos/auditoría, marcaje presencial y home office, falta tardía, permisos/evidencias, decisión definitiva y devolución de saldo, dashboard/diagnóstico, 404 y recarga. Los E2E ejecutan Chromium escritorio y Pixel 7 emulado; no son prueba de teléfono físico o Safari/Firefox.

Pendientes visuales para las siguientes fases: temas reales, foco/teclado completo, lector de pantalla, contraste AA de nuevas superficies y glass, preservación de scroll/filtros, errores por campo, zoom 200%, pantalla táctil/GPS físico e interacción bajo red lenta. La entrega actual establece la referencia y registra brechas; no declara certificación WCAG.
