# Planos de pantallas y navegación

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Shell y rutas existentes

Modificar `app/root-layout.tsx`, no sustituir TanStack Router. Sidebar desktop: Inicio, operación (Calendario, Asistencia, Incidencias), personal (Empleados, Departamentos, Responsables), solicitudes (Solicitudes, Aprobaciones, Vacaciones), avisos, configuración y cuenta. Mostrar navegación por capacidades sin inventar una matriz distinta del backend. Header con breadcrumb, búsqueda local de rutas, campana y cuenta. Móvil: Inicio, Jornada, Calendario y Más (acceso a las rutas permitidas). Mantener `/estado` donde proceda.

| Ruta real                   | Plano visual y acción                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/ingresar`                 | Logo original, panel glass ahumado, identificador + clave existentes, mostrar clave, recuperación, enviar          |
| `/recuperar`                | Código/token y nueva clave según contrato, instrucciones sin prometer correo                                       |
| `/`                         | Jornada propia primero para empleado; para responsables, resumen y pendientes autorizados; enlaces con filtro real |
| `/asistencia`               | Reloj orientativo, turno actual, acción ENTRY/EXIT válida, verificación GPS solo presencial, historial y resultado |
| `/incidencias`              | Filtros de rango, agrupación empleado/turno, evaluación original, motivo y resolución separados                    |
| `/calendario`               | Mes y agenda existentes, navegación temporal, chips de estado y modalidad, editor de borrador y confirmación       |
| `/turnos`                   | Plantillas, horarios, días, modalidad, versión y estado; edición sin alterar publicados                            |
| `/empleados`                | Directorio por alcance, búsqueda visible, panel de edición de expediente, proteger cuentas privilegiadas           |
| `/departamentos`            | Lista y alta/edición autorizadas; errores de referencias visibles                                                  |
| `/responsables`             | Asignaciones con vigencia, historial/revocación, claridad de titular y suplente                                    |
| `/solicitudes`              | Historial propio/alcance, creación por tipo, campos condicionados y evidencia según contrato                       |
| `/aprobaciones`             | Bandeja priorizada, detalle y motivo de decisión; solo `canDecide` habilita acciones                               |
| `/vacaciones`               | Períodos separados, concedido/reservado/disponible/aprobado/disfrutado, movimientos; sin saldo ficticio            |
| `/avisos`                   | Bandeja propia, no leídos, marcar uno/todos y enlace interno seguro                                                |
| `/ubicaciones`              | Centros y autorizaciones vigentes, precisión/radio configurados; no tracking de personas                           |
| `/configuracion`            | Grupos de configuración y diagnóstico accionable con severidad real                                                |
| `/configuracion/asistencia` | Política y tolerancias editables; advertir que solo afectan controles nuevos                                       |
| `/politicas-ausencias`      | Versiones, goce, evidencia, horas obligatorias y anticipación                                                      |
| `/usuarios`                 | Gestión según privilegios, recovery seguro; no exponer secreto persistentemente                                    |
| `/auditoria`                | Tabla paginada y detalle antes/después sanitizado, fecha y actor                                                   |
| `/cuenta`                   | Perfil y cambio de clave según contrato; cerrar sesión                                                             |
| `/estado`                   | Estado técnico sin secretos; respetar protección vigente                                                           |

## Dashboard exacto

Usar `GET /api/dashboard`: fecha civil servidor, hora de generación, resumen diario, jornada, incidencias, solicitudes, saldo por período y conteo exacto de avisos. No sumar indicadores que representan dimensiones superpuestas. `evaluation:null` no equivale a falta. Actividad en vivo, porcentajes de puntualidad y reportes nuevos solo si contratos/datos sustentan las métricas; no inventar series. Mostrar vacío cuando no existe jornada o periodo. No poner motivos privados ni GPS en resumen.

## Calendario premium

Borradores movibles mediante drag & drop existente, con confirmación y alternativa por formulario. Publicados son de solo lectura para edición; cancelación con motivo y nuevo borrador cuando corresponda. Guardias, festivos y conflictos se validan en servidor. Semana visual, duplicación y acciones masivas son mejoras propuestas: diseñar después de validar contratos; no aparentar atomicidad con múltiples writes.

## Límites

No crear rutas de reportes, soporte, biometría, expediente documental ni app offline como si existieran. La vista móvil es web responsiva. Todos los diseños preservan los campos y acciones actuales; no esconder errores ni romper enlaces existentes.
