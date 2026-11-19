# Solicitudes, aprobaciones y ausencias — etapas 14–15

Sesión obligatoria, respuestas privadas y CSRF en escrituras. Un empleado activo envía sus propias solicitudes; ADMIN/HR configuran políticas y saldos, sin sustituir al jefe ni al director. Cada mutación lleva `idempotencyKey` UUID: mismo actor, operación y contenido conserva su respuesta; reutilizarlo con datos distintos devuelve conflicto.

## Solicitudes y decisiones

| Método y ruta                                | Función                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /api/requests`                          | Solicitudes propias y alcance autorizado, decisiones/evidencias y acciones permitidas por el servidor. |
| `POST /api/requests`                         | Envía vacaciones, permiso, justificación o solicitud de cancelación propia.                            |
| `POST /api/requests/:id/decision`            | `{decision:APPROVE                                                                                     | REJECT,reason,idempotencyKey}`. El servidor determina el paso vigente. |
| `POST /api/requests/:id/withdraw`            | `{reason,idempotencyKey}`, retiro propio pendiente y liberación de reserva.                            |
| `GET /api/requests/:id/evidence/:evidenceId` | Descarga privada con autorización de la solicitud, como attachment y nosniff.                          |

Regla actual confirmada por el usuario: la aprobación de jefatura es definitiva. Las solicitudes nuevas guardan `approvalFlow: HEAD_ONLY` y pasan de `PENDING_HEAD` a `APPROVED` al autorizar jefatura/suplencia o el superior explícito correspondiente. El consumo, resolución de incidencia o cancelación/reintegro se aplica en esa transacción.

Las solicitudes previas conservan `approvalFlow: HEAD_DIRECTOR` y el circuito `PENDING_HEAD` → `PENDING_DIRECTOR` → `APPROVED`. La migración 0010 no las aprueba ni modifica sus decisiones. El cliente no puede elegir `approvalFlow`; enviarlo en creación produce error de validación.

Un rechazo conserva las decisiones y termina en `REJECTED`. Un retiro pendiente termina en `WITHDRAWN` y conserva `withdrawal:{reason,actorId,createdAt}` privado, visible al recargar el historial. Cancelación aprobada separada deja la solicitud original en `CANCELLED`.

Se admite decidir más tarde una solicitud enviada en tiempo; no se inventa una fecha de caducidad de aprobación. La cancelación sí debe seguir siendo futura al resolver.

Se exige motivo en solicitudes y decisiones. Jefatura y suplencias se revalidan al decidir, con intervalos y titular fuente vigentes. Para solicitudes de un jefe se usa exclusivamente su superior explícito activo; si falta cadena válida se pide configuración. No se permite autoaprobación. En el flujo histórico de dos pasos, sus actores deben ser distintos. Roles ADMIN/HR o lectura global no otorgan autoridad de decisión. Se conserva evidencia de responsabilidad/relación superior, actor, hora y motivo.

Cada solicitud congela departamento y datos de negocio. El acceso respeta ese departamento, la propiedad y los responsables vigentes. Una suplencia vencida o una jefatura revocada deja de poder decidir. Las resoluciones generan avisos internos al empleado y RR. HH.; no contienen motivos personales, contactos o archivos. Negocio, auditoría y outbox confirman en una transacción, mientras la entrega se reintenta independientemente.

## Datos por tipo

Entrada común `{kind,reason,idempotencyKey,evidence?}`:

- `VACATION`: `fromDate`, `toDate`, `vacationPeriodYear` (año de servicio concedido). Se calculan y congelan los días laborables de la política, reservando saldo hasta resolución.
- `PERMISSION`: `fromDate`, `toDate`, `permissionTypeId`; ambos `partialStartsAt` y `partialEndsAt` como instantes UTC válidos si el tipo exige horas (`partialOnly`), opcionales en los demás tipos que admiten intervalos parciales. El tipo define goce, evidencia y anticipación mínima. El intervalo representa las horas de ausencia, no el tiempo que se trabajará.
- `JUSTIFICATION`: `incidentId` propio. Conserva incidencia, marcajes y evaluación originales; la aprobación definitiva de jefatura reconoce la resolución separada en solicitudes nuevas; las históricas siguen su versión. No duplicar justificación pendiente/aprobada de una misma incidencia.
- `CANCELLATION`: `originalRequestId` propio aprobado de vacaciones/permiso, todavía futuro. La solicitud de cancelación nueva requiere aprobación definitiva de jefatura y vuelve a comprobar que no haya comenzado al resolver. No modifica la original mientras se revisa ni cuando se rechaza. La aprobación devuelve consumo una sola vez. No cancelar por este flujo períodos ya iniciados ni devolver días disfrutados.

Fechas civiles inclusivas; máximo 93 días. No se tramitan vacaciones/permisos iniciados en fechas pasadas por este flujo: usar justificación para incidencias. Los solapamientos entre solicitudes activas del mismo empleado se validan del lado servidor. Las evidencias se incluyen al enviar y quedan inmutables.

## Evidencias privadas

`evidence` acepta hasta tres `{filename,mimeType,contentBase64}`. Máximo 1 MiB binario por archivo, PDF/PNG/JPEG; se validan nombre, base64 canónico, tamaño y firma coherente con MIME. JSON de creación tiene un límite específico acotado para transportar los tres archivos; no se amplía el resto de rutas. Los archivos se guardan en PostgreSQL, nunca en rutas públicas. Listados entregan metadatos, no contenido. Descarga ajena/anónima denegada; archivos se sirven como adjuntos sin ejecución inline.

## Políticas y saldo de vacaciones

| Método y ruta                         | Función                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/leave/configuration`        | Política vigente y catálogo de permisos.                                                                                                    |
| `PUT /api/leave/policy`               | ADMIN/HR crea versión, nombre, tabla `{fromYear,days}`, días laborables por categoría y exclusión de festivos.                              |
| `POST /api/leave/permission-types`    | ADMIN/HR crea tipo `{name,paid,evidenceRequired,allowPartial,active,idempotencyKey}`.                                                       |
| `PUT /api/leave/permission-types/:id` | ADMIN/HR edita/versiona tipo; solicitudes anteriores conservan snapshot.                                                                    |
| `GET /api/vacation/balances`          | Saldos/movimientos según alcance: concedido, reservado, disponible, aprobado y disfrutado.                                                  |
| `POST /api/vacation/grants`           | ADMIN/HR: `{employeeId,anniversaryYear,reason,idempotencyKey}`. Concesión explícita calculada por antigüedad/política, una por aniversario. |
| `POST /api/vacation/adjustments`      | ADMIN/HR: mismos campos más `days` entero positivo/negativo y motivo. Conserva movimiento e impide saldo disponible negativo.               |

No se carga una política empresarial ni se generan saldos históricos automáticamente. RR. HH. debe configurar una política y conceder períodos cumplidos. No se aplica caducidad automática. Las reglas legales y beneficios internos deben validarse antes del uso operativo; la configuración técnica no constituye certificación laboral. La referencia legal consultada para la decisión pendiente fue la [Ley Federal del Trabajo, capítulo de vacaciones](https://www.ordenjuridico.gob.mx/Documentos/Federal/html/wo125151.html); no se codificaron mínimos o plazos legales como política empresarial confirmada.

### Permisos por horas confirmados el 18-11-2026

Entrada tardía y Salida anticipada están configurados en desarrollo como activos, con goce de sueldo, motivo obligatorio y sin comprobante obligatorio. Exigen intervalo por horas y al menos **24 horas transcurridas antes del inicio de la ausencia**, con hora del servidor; exactamente 24 horas es válido. No se sustituyen por una comparación de fechas. Para entrar tarde se captura desde el inicio de jornada hasta la entrada prevista; para salir antes, desde la salida prevista hasta el fin de jornada (actualmente 17:00 en la jornada administrativa). No se impone ese horario a todos los turnos ni se verifica aquí el anclaje a una jornada publicada.

El catálogo admite los campos adicionales `minimumNoticeHours` (entero 0–8760; 0 desactiva anticipación) y `partialOnly` (booleano). Exigir horas requiere `allowPartial:true`; omitirlas devuelve `PARTIAL_REQUIRED`. Aviso insuficiente devuelve `INSUFFICIENT_NOTICE`. En tipos que admiten días completos se cuenta desde medianoche civil de Mérida. Campos omitidos al editar conservan las restricciones anteriores; en altas genéricas tienen valores 0/false. La migración 0012 conserva esos valores históricos y no añade tipos automáticamente.

ADMIN/HR y SUPER_ADMIN pueden cambiar **Con goce de sueldo** en `/politicas-ausencias`, además de anticipación, evidencia y obligatoriedad de horas. Cada solicitud congela goce, versión y restricciones: cambiar el tipo afecta solo solicitudes nuevas. Los reintentos idempotentes anteriores a 0012 reciben los valores históricos 0/false sin tomar la configuración vigente. El permiso no consume vacaciones ni ejecuta descuentos de nómina.

La política de vacaciones LFT fue publicada en desarrollo el 17-11-2026 y el usuario confirmó el 18-11 que los períodos se rigen por ella. Se mantienen concesiones por aniversario y movimientos explícitos: falta conocer días ya utilizados para establecer saldos históricos disponibles. Ver [evidencia de permisos por horas](../verification/2026-11-18-hourly-permissions.md).

Libro inmutable: concesión/ajuste, reserva, liberación, consumo aprobado y devolución. El disponible descuenta reservas pendientes, también bajo concurrencia. El rechazo/retiro libera reserva, la aprobación consume sin duplicar, y una cancelación futura aprobada devuelve consumo con movimiento separado. Una pareja real de entrada/salida completa conserva evaluación COMPLETE aunque exista cobertura aprobada. Los días disfrutados se identifican por fechas civiles anteriores al día actual de Mérida.

## Integración de asistencia y planificación

La evaluación automática reconoce turnos completamente cubiertos por ausencia aprobada como `AUTHORIZED_ABSENCE`, sin inventar una falta. Un permiso parcial que no cubre todo el turno no exime de marcar el resto de la jornada. Vacaciones cubren exclusivamente fechas civiles cargadas al saldo, incluidos turnos que cruzan medianoche por su `workDate`.

Aprobar después de una falta conserva su evaluación original y muestra resolución separada; el bloqueo por motivo deja de aplicar a la incidencia resuelta. Una justificación aprobada resuelve solo la incidencia vinculada. Cancelaciones dejan de otorgar cobertura. Publicar un turno completamente cubierto por ausencia aprobada devuelve conflicto. No se alteran marcajes originales ni se aplican cálculos de nómina.

Web: `/solicitudes`, `/aprobaciones`, `/vacaciones`, `/politicas-ausencias` (esta última ADMIN/HR). Los errores de conexión conservan UUID/payload para reintentar el mismo envío. La aplicación móvil/offline permanece en etapa 16.
