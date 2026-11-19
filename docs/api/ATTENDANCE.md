# Asistencia — etapa 13

Rutas web `/asistencia` y `/incidencias`. Sesión obligatoria y respuestas `Cache-Control: no-store`. Las escrituras necesitan CSRF. Instantes UTC; turnos con zona IANA y fecha civil `workDate`. Consultas con `from`/`to` inclusivos, máximo 93 días válidos.

| Método y ruta                               | Función y autorización                                                                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/attendance/me`                    | Empleado propio, hora servidor, política, turnos cercanos e incidencias propias sin motivo. Cuenta sin empleado recibe `employee: null`. |
| `GET /api/attendance/policy`                | Política vigente para usuarios autenticados.                                                                                             |
| `PUT /api/attendance/policy`                | ADMIN/HR: crea versión, conserva las anteriores.                                                                                         |
| `POST /api/attendance/punches`              | Solo marcaje del empleado activo vinculado al actor.                                                                                     |
| `GET /api/attendance/summary?from&to`       | Turnos, empleado, intentos, política congelada, evaluaciones e incidencias según alcance.                                                |
| `GET /api/attendance/incidents?from&to`     | Incidencias y motivos según alcance. La web agrupa por empleado/turno usando el resumen.                                                 |
| `POST /api/attendance/incidents/:id/reason` | Solo el empleado afectado: agrega motivo inmutable `{reason}` de 1–2000 caracteres.                                                      |
| `POST /api/attendance/evaluate`             | ADMIN/HR: `{from,to}`, evalúa vencidos con hora servidor.                                                                                |

## Marcajes y política

Entrada `{assignmentId,direction:'ENTRY'|'EXIT',idempotencyKey:UUID,latitude?,longitude?,accuracy?,reason?}`. Rechaza campos extra, hora enviada por cliente y suplantación. El UUID devuelve la respuesta original en reintentos; reutilizarlo con otro contenido devuelve 409. En home office las coordenadas se ignoran tanto en la huella de idempotencia como en la persistencia.

Devuelve 200 `{attempt,incidents,requiresReason}` también para un intento conservado pero rechazado: comprobar `attempt.accepted` y `rejectionCode`. No confundir éxito HTTP con marcaje aceptado. Un único ENTRY/EXIT aceptado por turno, con exclusión concurrente. No se aceptan entradas posteriores a una salida aceptada. Intentos repetidos con UUID nuevo se conservan como rechazo/incidencia.

Política inicial `{lateToleranceMinutes:10,earlyEntryMinutes:30,lateExitMinutes:120}`. Límites inclusivos: ENTRY desde inicio menos anticipación hasta fin; EXIT desde inicio hasta fin más margen posterior. Retardo desde minuto completo 11; salida anterior al fin genera incidencia. Ventana 30/120 propuesta, configurable y pendiente de validación operativa. PUT admite tolerancia 0–120 y márgenes 0–1440 minutos enteros. Cada control iniciado congela su política; cambiarla no modifica sus evaluaciones.

Confirmación del 18-11-2026: `administrativeAbsenceMinutes` opcional/null o entero 1–1440, mayor que la tolerancia. Omitir en PUT conserva su valor previo; null lo desactiva. Configurado en desarrollo a 30: para administrativos con inicio 08:00, desde 08:30 inclusive genera `LATE_ABSENCE`, con marcaje **aceptado** y hora real, siempre sujeto a GPS, ventana y orden. Se usa categoría congelada en el turno; no se aplica a operativos. Snapshots anteriores sin campo/null conservan sus reglas. Motivo y justificación HEAD_ONLY siguen disponibles; motivo no resuelve automáticamente.

Presencial valida ubicación fresca y precisión en cada entrada/salida contra centro asignado y autorizado, dentro de la misma transacción. Rechazos por falta de GPS, precisión o geocerca conservan comprobación e incidencia. Home office no solicita GPS ni crea `geo_checks`, y devuelve `geoCheckId:null`. El resumen no expone coordenadas personales ni datos de contacto.

## Incidencias y evaluación

Retardo/salida anticipada son marcajes conservados con incidencia pendiente. Intento fuera de ventana o GPS inválido no es marcaje aceptado. Si falta motivo de cualquier incidencia propia, se bloquea el siguiente marcaje con 409 `REASON_REQUIRED`. Añadir motivo no altera eventos ni equivale a aprobación.

Al superar el cierre: sin entrada/salida → `ABSENCE`; solo entrada → `MISSING_EXIT`; solo salida → `MISSING_ENTRY`; ambas → `COMPLETE`. Worker y evaluación manual conservan una única evaluación por turno y no duplican incidencias/avisos. El cierre exacto aún permite salida; la evaluación comienza después. No se generan faltas automáticas históricas anteriores a la activación inicial sin control iniciado.

Con el corte nuevo activo, una entrada administrativa desde el límite produce evaluación `LATE_ABSENCE` aunque existan ambos marcajes. Si además falta salida, conserva incidencia `MISSING_EXIT`. No se duplica la falta creada al entrar. La aprobación de una justificación agrega resolución separada y conserva resultado/eventos originales. Ver [evidencia actual](../verification/2026-11-18-official-holidays-attendance.md).

Turnos publicados con control iniciado no pueden cancelarse para ocultar historial: 409 `ATTENDANCE_STARTED`. No hay API para editar/borrar eventos, motivos o incidencias. Auditoría y outbox son atómicas; actor de evaluación manual identificado, worker con actor sistema. Avisos internos sin motivos personales, contactos o coordenadas en su contenido. Aprobaciones jefe/director pertenecen a etapa 14; biometría nativa/offline a etapa 16.

## Errores principales

400 datos/rango/motivo inválido; 401 sin sesión; 403 CSRF/permisos o cuenta sin empleado activo; 404 turno ajeno/no publicado o incidencia ajena; 409 `IDEMPOTENCY_CONFLICT`/`REASON_REQUIRED`; 503 `POLICY_REQUIRED` si no se aplicó habilitación. Errores de infraestructura revierten toda la transacción; la interfaz conserva el mismo UUID/payload para reintentar un resultado desconocido.
