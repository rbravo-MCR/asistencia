# Dashboard y configuración administrativa

## Lecturas

- `GET /api/dashboard`: requiere sesión; no acepta departamento ni usuario destino. Resuelve alcance vigente y devuelve fecha civil en `APP_TIME_ZONE`, hora de generación, jornada personal, resumen diario, incidencias sin resolver, solicitudes pendientes, vacaciones personales por período y total exacto de avisos sin leer.
- `GET /api/configuration/status`: requiere ADMIN/HR. Devuelve advertencias y revisiones informativas con código, descripción, cantidad y enlace. La ventana “próximos 7 días” incluye hoy y seis fechas más; ambas fechas se muestran.

Ambas respuestas usan `Cache-Control: no-store`. Sin sesión: 401; diagnóstico sin autorización: 403. Los contratos estrictos están en `packages/contracts/src/dashboard.ts`.

## Alcance y privacidad

Empleado: información propia. Jefaturas/suplencias: propio y departamentos vigentes. Dirección/ADMIN/HR: alcance general de consulta. Las facultades de aprobar se calculan por solicitud y paso mediante el servicio existente: ni ADMIN ni HR sustituyen al jefe/director. Un superior explícito puede tener decisiones pendientes sin dirigir un departamento.

No se devuelven motivos personales, contenido/nombres de evidencias, coordenadas, tokens, correos de empleados ni movimientos con motivos privados. Los saldos personales mantienen cada período separado. Sin períodos concedidos se informa ese estado en lugar de inventar un saldo.

## Significado de los indicadores

El resumen diario incluye turnos publicados cuya fecha de inicio civil coincide con la fecha del servidor. Un nocturno conserva la fecha de inicio. La jornada personal prioriza el turno en curso y su ventana de salida, incluso si comenzó ayer; después conserva el estado del día o presenta el próximo turno.

- `entry`/`exit` representan únicamente intentos aceptados. Un intento rechazado no cuenta como marcaje.
- `evaluation` conserva el resultado persistido; null no significa falta.
- `authorizedAbsence` señala cobertura completa aprobada cuando no existe pareja completa de marcajes; no sobrescribe la evaluación original.
- `phase`: UPCOMING, IN_PROGRESS (incluye ventana posterior), AWAITING_EVALUATION, HISTORICAL o EVALUATED. Un pendiente de evaluación requiere cierre de ventana y elegibilidad conforme a la activación inicial o un control ya iniciado.
- Las incidencias abarcan todo el historial autorizado y excluyen resoluciones aprobadas. Un motivo capturado no resuelve una incidencia.
- Las solicitudes abarcan todos los pendientes autorizados, con `canDecide` calculado por servidor. No incluyen razones ni archivos.
- Los avisos usan el conteo exacto de la bandeja existente; no se cuentan solo los primeros 100 elementos.

Los indicadores pueden describir dimensiones distintas del mismo turno. “Faltas evaluadas · registro original” conserva el resultado histórico aunque una solicitud posterior lo justifique. Los detalles del dashboard identifican empleado, turno/fecha, estado e intervalo correspondiente.

## Configuración

`/configuracion` reúne organización, asistencia, horarios, ubicaciones y ausencias. Usuarios/auditoría aparecen solo para ADMIN. `/configuracion/asistencia` reutiliza el formulario de política vigente; PUT exige ADMIN/HR y CSRF, genera versión nueva y conserva los snapshots anteriores. El acceso previo desde `/asistencia` permanece.

El diagnóstico actual informa jefatura/superior/cadena de aprobación inválidas, cuentas faltantes, plantillas por categoría, centros/autorizaciones vigentes y políticas/tipos de permiso faltantes. Sin turnos próximos, festivos o períodos concedidos son revisiones informativas, no faltas ni concesiones exigibles.

Calendario, asistencia e incidencias admiten `from=YYYY-MM-DD&to=YYYY-MM-DD`; se validan fechas reales y un máximo de 93 días. Parámetros inválidos se descartan y se usa la vista habitual. Los enlaces de indicadores llevan al intervalo o muestran primero el detalle que compone el total.

Las consultas no evalúan asistencia, crean incidencias, conceden saldos ni generan cambios de auditoría. Las escrituras exitosas invalidan dashboard/diagnóstico; hay actualización manual y recarga al regresar. Cambiar/cerrar sesión elimina la caché del usuario anterior.

## Límites

No configura datos empresariales ni representa certificación de producción. App móvil, offline, biometría y despliegue quedan fuera de esta entrega.

Las solicitudes nuevas requieren solo aprobación definitiva de jefatura. Las acciones de dirección se muestran únicamente en solicitudes históricas cuyo flujo guardado sea HEAD_DIRECTOR. La falta de dirección no bloquea el diagnóstico del flujo nuevo.
