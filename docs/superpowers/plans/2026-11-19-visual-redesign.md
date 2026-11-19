# Rediseño integral MCR — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Rediseñar las 22 rutas web y sus estados con la dirección MCR aprobada, conservando funciones y reglas de negocio.

**Architecture:** Componentes visuales puros y patrones compartidos sobre las primitivas actuales; cada feature conserva consultas, permisos, validación y mutaciones. Adopción por bloques completos con regresión antes de avanzar, sin sustituir composiciones específicas por un cambio global de CSS.

**Tech Stack:** React/TanStack Router/Query, RHF/Zod, Tailwind, Radix y Lucide existentes; Node 26.13.1 y pnpm 12.18.0.

**Spec:** [Diseño integral aprobado por el usuario el 19-11-2026](../specs/2026-11-19-visual-redesign-design.md).

## Global Constraints

- Mantener backend, contratos, migraciones, lockfile, `.env` y datos operativos.
- Mantener logo, siete colores, Google Sans local, temas claro/oscuro/sistema y las 22 rutas.
- Conservar CSRF, autorización, alcance, fechas servidor/civiles, idempotencia, GPS solo presencial, snapshots, aprobaciones nuevas/históricas, evidencias privadas y períodos de vacaciones.
- Sin funciones, métricas, fotografías, estados, integraciones o exportaciones simuladas.
- Sin dependencias nuevas. Formularios y tablas sólidos; glass selectivo con fallback y efectos reducidos.
- Rama sin commits: snapshot y manifiestos por bloque, sin commit inicial que mezcle trabajo ajeno. Ejecución inline con revisión independiente al cerrar; la aprobación del diseño autoriza continuar con todos los bloques.
- Integración solo PostgreSQL `_test`. E2E completa con un worker para aislar la carrera de lectura/limpieza de fixtures ya registrada; no modificar el contrato ni declarar resuelto el paralelo.

## Review Focus

- Sesión lenta o revocada: evitar destellos privados y limpiar el contenido del usuario anterior (tareas 2 y 8).
- Borrador y mutación/refetch lentos: bloquear cierre/navegación hasta concluir, conservar errores y texto (tareas 3–6).
- Texto largo y zoom: no perder acciones ni campos a 320 px o con ampliación (tareas 1 y 8).
- Indicadores ambiguos: mantener definiciones y estados reales, sin deducir faltas ni autoridad de aprobación (tareas 2, 3 y 6).
- Teclado/gestores de contraseña: búsqueda de rutas sin capturar escritura, foco restaurado y pegado/autocompletado (tareas 1–2 y 8).

## Task 1: Patrones compartidos y navegación

**Files:** `components/patterns/{page-header,async-state,inline-notice}.tsx`, `components/layout/{route-search,app-shell}.tsx`, `features/identity/form-fields.tsx`, `features/employees/query-feedback.tsx`, `styles.css`, pruebas de patrones y `tests/e2e/redesign-foundation.spec.ts`.

**Interfaces:** `PageHeader({title, description?, eyebrow?, actions?})`; `AsyncState({kind, title, description?, action?})`; `InlineNotice({tone, children})`; `RouteSearch({navigation: NavigationGroup[]})`. Patrones sin fetch ni permisos propios. `Page` conserva su interfaz y admite acciones/eyebrow; QueryFeedback conserva su firma.

- [x] Probar búsqueda local: solo destinos autorizados, filtrar y navegar por teclado, Escape/restauración, ignorar atajo mientras se escribe.
- [x] Implementar patrones, workspace ancho y encabezados consistentes; migrar el feedback común preservando textos y reintentos.
- [x] Verificar tipos/UI y reflow 320–1440, ambos temas. Pruebas funcionales nuevas antes del código; acabado reversible se verifica visualmente.

## Task 2: Acceso, cuenta, bienvenida y dashboard

**Files:** `components/layout/auth-layout.tsx`, `components/ui/password-input.tsx`, `features/identity/auth-pages.tsx`, `app/root-layout.tsx`, `features/dashboard/dashboard.tsx`, `pages/home-page.tsx`, `styles.css`, pruebas UI/E2E de acceso y dashboard.

**Interfaces:** `AuthLayout({title, description, children})` para login/recuperación; `PasswordInput` conserva las props/ref de Input y añade visibilidad accesible. Dashboard conserva `SessionView`, contratos y cálculos actuales.

- [x] Probar mostrar/ocultar clave sin alterar valor, pegado/autocompletado, errores y bloqueo de envío; comprobar login y recuperación reales.
- [x] Diseñar acceso MCR con fondo CSS, formulario legible, navegación pública y selector de tema; sin correo ficticio. Separar identidad/cambio de contraseña en Cuenta.
- [x] Componer dashboard con un hero, jornada personal o vinculación, resumen autorizado y pendientes; conservar todos los indicadores, definiciones, enlaces y detalles actuales.
- [x] Verificar pruebas de sesión/dashboard, E2E y capturas claro/oscuro/móvil/desktop, incluidos carga y error sin ceros ficticios.

## Task 3: Asistencia e incidencias

**Files:** `features/attendance/{attendance-pages,attendance-policy}.tsx`, patrones consumidores reales, pruebas existentes de attendance y nuevas capturas.

**Interfaces:** conservar handlers/payloads de marcaje, `AttendanceMeSchema`, resultados aceptados/rechazados y `DateRange` existentes.

- [x] Ordenar jornada/turno/acción y confirmación del servidor; separar historial, filtros y resultados. Incidencias con evaluación, motivo y resolución explícitos.
- [x] Revalidar presencial/home office, 200 rechazado, motivo, doble clic, UUID exacto, conflicto, timeout y nocturnos. Política agrupada y unidades visibles.
- [x] Comparar capturas y reflow, foco y acciones disponibles con red lenta; conservar todo el contenido funcional.

## Task 4: Calendario y turnos

**Files:** `features/planning/{calendar-page,shifts-page,controls}.tsx`, pruebas planning/steps10-12 y matriz visual.

**Interfaces:** mantener rango inclusivo ≤93 días, mes/agenda, editor, drag existente con confirmación y alternativa de formulario.

- [x] Calendario sólido con controles compactos, mes legible y agenda móvil; editor contextual, confirmaciones de mover/publicar/cancelar y errores 409 persistentes.
- [x] Directorio de plantillas/versiones y edición contextual; festivos reales separados visualmente.
- [x] Verificar cruce de medianoche, guardias, publicados protegidos, categoría/modalidad, teclado y 320 px sin pérdida de funciones.

## Task 5: Equipo y responsables

**Files:** `features/employees/assignments-page.tsx`, `features/employees/*`, `features/departments/*` solo para armonizar; pruebas de organización y E2E existentes.

**Interfaces:** conservar edición completa de Empleados y Departamentos ya implementada; Responsables conserva campos, vigencias, revocación y permisos.

- [x] Pasar Responsables a historial/directorio claro y asignación contextual, con estados de vigencia explicados y revocación accesible.
- [x] Comprobar compatibilidad de las pantallas ya renovadas con los patrones nuevos, sin reemplazar trabajo válido.
- [x] Verificar CRUD/referencias, titular/suplente/dirección, borrador/pending y retorno de foco.

## Task 6: Solicitudes, aprobaciones y vacaciones

**Files:** `features/requests/{requests-pages,request-list,vacation-page,policies-page,controls}.tsx`, pruebas requests y capturas de flujos.

**Interfaces:** `canHeadDecide`/`canDirectorDecide` en detalle, `canDecide` en resumen. Conservar formulario condicionado, archivo privado y todos los movimientos de saldo.

- [x] Historial primero y nueva solicitud contextual; restricciones visibles por tipo. Bandeja de decisiones antes del historial, con detalle y motivo persistentes.
- [x] Períodos de vacaciones con cifras del servidor y movimientos; administración contextual, sin saldo histórico inventado.
- [x] Políticas/versiones con condiciones legibles y edición contextual de tipos de permiso.
- [x] Probar permisos por horas/anticipación, HEAD_ONLY/histórico, no autoaprobación, archivos, reservas/consumo/devolución únicos y cancelación futura.

## Task 7: Administración y páginas de soporte

**Files:** `features/{locations/locations-page,configuration/configuration-page,audit/audit-page,notifications/notifications-page}.tsx`, `pages/{system-page,not-found-page,route-error-page,route-pending-page}.tsx`.

**Interfaces:** conservar comprobación GPS bajo demanda, CRUD/autorizaciones, diagnóstico de severidad real, auditoría paginada/sanitizada y avisos propios con destino seguro.

- [x] Ubicaciones: separar comprobación, centros y autorizaciones, con edición contextual y confirmaciones.
- [x] Configuración: grupos accionables y diagnóstico; auditoría: filtros/tabla/detalle; avisos: bandeja/no leídos con acciones reales.
- [x] Aplicar lenguaje visual a estado, 404, error y carga; mantener recuperación y navegación.
- [x] Verificar permisos, errores, reintentos apropiados, paginación real, enlaces seguros y estados vacíos.

## Task 8: Auditoría de cierre de las 22 rutas

**Files:** documentación de verificación, pruebas E2E pertinentes y reparaciones de los archivos anteriores.

- [x] Registrar cobertura de cada ruta y estados reales; matriz 320/360/390/768/1024/1280/1440, claro/oscuro/sistema, zoom 200 %, teclado/foco, reduced motion/transparency y forced colors.
- [x] Ejecutar `pnpm check`, integración PostgreSQL y E2E completa; registrar salidas y límites. No sumar repeticiones como casos nuevos.
- [x] Medir build explícito de producción: cargas frías login/dashboard/asistencia y comparar bundle/LCP/CLS. Separar laboratorio y campo; no inventar INP/Lighthouse/GPS físico.
- [x] Revisión independiente del cambio completo y corrección de hallazgos importantes; demostrar preservación de fuentes protegidas.
- [x] Marcar objetivo completo solo con cobertura/evidencia de todas las rutas y requisitos, sin declarar producción o accesibilidad certificada.

## Cierre de ejecución — 19-11-2026

Las ocho tareas se acreditan en el [informe integral](../../verification/2026-11-19-mcr-integral/README.md): 236 pruebas de aplicación, 175 PostgreSQL y 88 E2E; 512 capturas y 72 cargas de producción comparadas. El cierre corresponde al rediseño visual local. El presupuesto preliminar JS 200 KiB sigue ligeramente excedido; no se declara producción, WCAG completa, GPS físico o rendimiento de campo. La evidencia protegida es explícita sobre el baseline parcial disponible y la ausencia de HEAD.
