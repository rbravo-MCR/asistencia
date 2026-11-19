# Plan incremental del frontend empresarial MCR

Estado actual al 19-11-2026: el usuario solicita **rediseñar toda la parte visual del proyecto**. La [propuesta integral](../specs/2026-11-19-visual-redesign-design.md) concreta las 22 rutas; su dirección MCR fue aprobada explícitamente. Continúa mediante el [plan de implementación integral](2026-11-19-visual-redesign.md). Las 22 rutas están implementadas y verificadas localmente; ver [entrega integral](../../verification/2026-11-19-mcr-integral/README.md). Empleados conserva su [evidencia de fase previa](../../verification/2026-11-19-visual-redesign/README.md). El límite anterior a Departamentos se conserva como antecedente histórico en sus evidencias, no como alcance actual de la solicitud.

Este plan conserva la referencia incremental histórica; la ejecución vigente y sus límites se acreditan en el plan integral del 19-11-2026.

Fecha: 18-11-2026. Dirección solicitada: experiencia empresarial propia de México Car Rental, excepcional en diseño y utilidad, manteniendo los contratos y la operación actual. Fuente obligatoria: `docs/AGENTS.md` y las quince guías `docs/frontend/00`–`14`, leídas íntegramente. Este plan desarrolla su secuencia y conserva la lista de doce puntos ya acordada.

## Análisis y baseline disponibles

[Contraste/inventario y línea base](../../verification/2026-11-18-ux-ui-baseline/README.md): 22 rutas, seis primitivas, capacidades y estados inventariados, 143 capturas y 18 mediciones iniciales; 399 pruebas en la referencia anterior. Deudas visibles: navegación muy alta, reflow Usuarios/Calendario, CLS elevado, importación anticipada y JS inicial 278.39 KiB gzip. Conservar causas documentadas y no reiniciar el inventario como si no existiera.

[Design System y tokens del punto 3](../../verification/2026-11-18-mcr-tokens/README.md): paleta oficial, Google Sans local autorizada, logo original, temas reales y pruebas nuevas. El cierre de esta base se registra con sus propios resultados, sin confundirlo con el rediseño terminado.

Decisiones vigentes que corrigen ambigüedades de las guías: conservar `LATE_ABSENCE`/corte administrativo relativo; `HEAD_ONLY` nuevo y `HEAD_DIRECTOR` histórico; detalle de solicitudes con `canHeadDecide`/`canDirectorDecide`, mientras el resumen usa `canDecide`. No restaurar requisitos antiguos de doble aprobación, biometría o JWT.

## Dirección de producto y arquitectura

Se continúa la app React/TanStack/Tailwind existente. Se descarta reemplazarla con plantilla administrativa o una segunda biblioteca. Los tokens poseen el lenguaje visual; las primitivas accesibles presentan; los patrones coordinan interacción visual; las features conservan consultas y mutaciones; el servidor mantiene la autoridad. App/pages → features → primitivas/lib, sin ciclos ni imports privados de backend.

Cada pantalla debe responder qué ocurre, qué importa y qué acción sigue. Empleado prioriza jornada y marcaje; jefatura prioriza pendientes decidibles; dirección consulta detalle autorizado; gestión técnica muestra configuración real. No usar charts ornamentales, dashboards ficticios, funciones en construcción presentadas como reales o contadores de dimensiones superpuestas.

La firma visual será navegación negra, selección/acción amarilla con negro, superficies neutras, tipografía y jerarquía claras. Glass ahumado selectivo en login, header, hero, reloj/confirmación y overlays autorizados. Nunca glass en tablas, formularios operativos o calendario. Incluir fallback opaco, reducción de efectos y contraste sobre fondos adversos. No vídeo, WebGL, blur anidado o animación continua.

## Fases y aceptación

### Fase 0 — análisis y referencia (puntos 1–2, terminados)

- [x] Políticas/contratos contrastados, discrepancias registradas.
- [x] Rutas, estados, permisos y cobertura inventariados.
- [x] Fuente original y evidencia inicial preservadas sin mezclar un commit inicial de todo el árbol.

### Fase 1 — Design System y tokens (punto 3, cierre documentado por separado)

Siete colores, Google Sans local/OFL, logo original, temas claro/oscuro/sistema, semántica de texto/superficie/foco/estado y espécimen local de desarrollo. Pruebas de persistencia, sistema, storage bloqueado/corrupto, otras pestañas, fuente caída, contraste real y colores forzados. Aceptación: cuatro pantallas de referencia en ambos temas; comparar carga/CLS, no esconder regresiones.

### Fase 2 — componentes y patrones (punto 4)

Reutilizar Button/Input/Label/Badge/Card/Table, Radix y CVA existentes. Extraer `PageHeader`, `StatusBadge`, `FormField`, `FilterBar`, `AsyncState`, `InlineNotice`, `Dialog/Sheet`, `ConfirmAction`, `MetricLink` y `GlassSurface` cuando exista consumidor real. No crear otra copia de primitivas ni resolver permisos/fetch dentro de Button/Badge.

Aceptar al demostrar teclado/Escape/foco restaurado, nombres accesibles, errores asociados, cambios sin perder texto, pending que evita doble envío y conserva anchura/contexto, éxito confirmado y resultado desconocido con recuperación. Estados con texto/icono, no solo color. Corregir desbordamiento de acciones de Usuarios dentro de la adopción de controles reutilizables.

### Fase 3 — navegación, acceso y dashboard (puntos 5–6)

Sidebar por capacidades, header compacto con breadcrumb, acceso a avisos/cuenta y búsqueda local de rutas autorizadas; móvil Inicio/Jornada/Calendario/Más con safe areas. Conservar TanStack Router, las 22 rutas, `/estado`, enlace de salto y protección de cada pantalla. Navegación por teclado y atajos sin capturar escritura de formularios. Preservar filtros, foco y scroll al volver.

Login/recovery con identidad propia y panel ahumado legible; permitir gestores/pegar y recuperación real sin prometer correo. Dashboard con jornada personal o pendientes autorizados primero, indicadores con definición y detalle/enlace real. Un hero protagonista; ningún gráfico o métrica sin soporte del contrato.

Aceptar al demostrar empleado/jefatura/dirección/HR/ADMIN/SUPER_ADMIN, acceso directo sin permiso, cambio de sesión sin datos residuales, navegación móvil, foco y red lenta. Medir altura/CLS del shell y tiempos de entrada al flujo principal.

### Fase 4 — jornada e incidencias (punto 7)

Acción disponible y turno visibles; reloj solo orientativo. Distinguir marcaje aceptado, aceptado con incidencia, rechazo e incertidumbre. Mantener payload/UUID exactos en reintento. GPS fresco solo presencial; home office sin solicitud/coordenadas. Evaluación, motivo y resolución separados; corte administrativo y nocturnos conservados.

Aceptar con entrada/salida presencial/home office, 200 rechazado, GPS inválido, motivo requerido, doble clic, 409, timeout/reintento, política histórica y falta tardía justificable. Confirmación duradera con hora del servidor y recuperación visible, sin éxito decorativo.

### Fase 5 — calendario y turnos (punto 8)

Mes/agenda, filtros claros, estados/modalidad, borrador/editado/publicado/cancelado, editor y confirmaciones. Corregir reflow a 320 px. Movimiento con confirmación, alternativa de formulario/teclado y restitución ante error. Publicados de solo lectura para edición; cancelación con motivo. No semana visual, duplicación o operaciones masivas sin validar contratos y alcance.

Aceptar con conflicto 409 sin pérdida de contexto, guardias/festivos, cruce de medianoche, modalidad/categoría, protección de publicados y navegación de fechas/rango inclusivo máximo 93 días.

### Fase 6 — personal, solicitudes y aprobaciones (puntos 9–10)

Directorio y expediente con búsqueda por alcance, edición clara, departamentos/responsables/vigencias, cuentas protegidas. Solicitud por tipo con restricciones visibles y evidencia privada; permisos por horas sin anclajes inventados a 17:00. Vacaciones por período y movimientos reales. Bandeja de aprobación prioriza acciones decidibles con motivos e historial.

Aceptar con CRUD persistido y referencias bloqueadas, SUPER_ADMIN protegido, permisos/cadena/suplencias vigentes, HEAD_ONLY e histórico, no autoaprobación, reserva/consumo/liberación/devolución únicos, cancelación futura y límites de evidencias conservados. Sin saldo histórico inventado ni nómina.

### Fase 7 — administración y cierre transversal (puntos 11–12)

Ubicaciones, configuración general/asistencia, políticas, usuarios, auditoría, avisos, cuenta y estado técnico. Diagnóstico accionable de severidad real, errores contextualizados, auditoría paginada/sanitizada y avisos propios con destino interno seguro.

Cerrar recorrido transversal: 320/360/390/768/1024/1280/1440, claro/oscuro/sistema, zoom 200%, teclado, lector de pantalla donde esté disponible, red lenta, reduced motion/transparency, forced colors y navegador disponible. Probar GPS físico aparte cuando exista equipo; no certificarlo con emulación.

## Gate obligatorio en cada fase

Aplicar `docs/frontend/14_DEFINITION_OF_DONE.md` al alcance de la fase. Entregar archivos y decisiones, pruebas con comando/salida/totales, capturas revisadas, baseline/final, defectos y propuestas no implementadas. Ejecutar `pnpm check`, integración PostgreSQL `_test` y E2E pertinentes; no editar pruebas para esconder fallos. Cuando cambie solo presentación reversible, complementar con comparación visual y pruebas de interacción relevantes.

P0 (seguridad, pérdida de datos o bloqueo de marcaje/decisión) impide entrega. P1 (foco/navegación inaccesibles, contraste o estado incorrectos, regresión significativa) se corrige antes de liberar. P2 se documenta con seguimiento. Metas propuestas: LCP ≤2.5 s, CLS ≤0.1, INP ≤200 ms, Lighthouse ≥95 si se dispone de herramienta/perfil; no inventar scores ni sustituir INP por TBT. JS/CSS se comparan contra baseline y el presupuesto se justifica. Instrumentación de campo/INP no se deduce de cargas sin interacción.

## Límites y control de cambios

Sin modificaciones de backend/contratos/migraciones/.env, privilegios o reglas de negocio sin autorización explícita. No paquetes innecesarios o instalaciones automáticas de Motion/dnd-kit/Recharts/TanStack Table. No generar datos o integraciones ficticias, PWA/offline, biometría, reportes/exportaciones nuevos o expediente documental. App móvil nativa y despliegue permanecen fuera de este rediseño web responsivo.

Las siguientes fases comienzan desde esta referencia y su aceptación; no se declara producto premium terminado por cambiar paleta, ni producción lista por tener pruebas locales verdes.

## Avance tras corrección visual del usuario

[Sidebar y directorio de Usuarios](../../verification/2026-11-18-sidebar-users/README.md) implementados: panel reusable, shell desktop/móvil y gestión de cuentas. Esta corrección adelanta el alcance concreto de navegación y Usuarios; no declara completas las fases 2, 3 o 7. Acceso/dashboard, demás componentes y flujos siguen su plan.
