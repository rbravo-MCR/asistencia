# Etapas 14–15: aprobaciones y ausencias — verificación local

**Resultado: etapas 14–15 cerradas y verificadas localmente. 314 pruebas aprobadas.**

## Entrega

Módulo `requests`: solicitudes propias de vacaciones, permisos, justificaciones y cancelaciones; autorización del jefe y visto bueno del director con decisiones separadas, motivos y evidencia de autoridad vigente. No autoaprobación, dos firmas de una misma persona ni bypass por roles ADMIN/HR. Suplencias conservan referencia al titular y se invalidan al perder vigencia; solicitudes de un jefe usan su superior explícito activo. Si no existe cadena válida, el envío se bloquea con mensaje de configuración.

Políticas versionadas sin seed empresarial, catálogo configurable de permisos, concesiones explícitas por aniversario, ajustes con motivo y libro de movimientos. Reserva concurrente, consumo solo tras director, liberación por retiro/rechazo y devolución por cancelación futura aprobada, exactamente una vez. Motivo/actor/fecha del retiro conservados en datos privados y visibles al recargar.

Evidencias privadas PDF/PNG/JPEG, hasta tres de 1 MiB, base64/tamaño/firma/nombre validados; PostgreSQL bytea, descarga autenticada attachment/nosniff/no-store y autorización por solicitud. Auditoría general y notificaciones no incluyen contenido ni motivos personales. Outbox transaccional con entrega independiente y avisos dirigidos a solicitudes propias o a la bandeja de aprobación según destinatario.

Web `/solicitudes`, `/aprobaciones`, `/vacaciones`, `/politicas-ausencias`. Estados de carga, vacío, error/reintento, envío y éxito; reintentos de resultado desconocido conservan UUID y payload. Decisiones visibles solo cuando el servidor autoriza el paso.

## Verificaciones

| Comprobación              | Resultado                                                                 |
| ------------------------- | ------------------------------------------------------------------------- |
| `pnpm check`              | 162 unitarias/UI; lint, modularidad, formato, tipos y build OK            |
| Suite PostgreSQL completa | 126 pruebas PostgreSQL aprobadas; proceso verificado con salida 0         |
| E2E escritorio/móvil      | 26 pruebas aprobadas; escritorio/móvil y salida 0                         |
| API compilada             | Readiness200, endpoints privados401 sin sesión, cierre SIGTERM0           |
| Revisión independiente    | Hallazgos importantes corregidos, sin otros P1/P2 concretos identificados |

Las 18 pruebas PostgreSQL del módulo incluyen dos reservas distintas concurrentes sobre saldo insuficiente; jefatura revocada, suplencia invalidada, cambio de superior y prohibición de la misma persona en ambos pasos; cancelación que inició mientras esperaba; rollback de archivos/solicitud/reserva; HTTP401/CSRF403; tres archivos de 1 MiB; descarga privada exacta y auditoría sin motivos/base64/nombres de archivo. La justificación real exige jefe y director, rechaza duplicado activo, libera el bloqueo y conserva deep-equal los eventos originales. Ocho pruebas adicionales comprueban integración de cobertura/resolución y planificación.

Se inspeccionaron capturas de saldo de vacaciones, solicitudes, cancelación y permiso rechazado en escritorio/móvil. E2E comprueba ausencia de desbordamiento horizontal.

Se probaron separación de pasos, autoridad vigente, saldo reservado y consumido/reintegrado una vez, conflictos UUID, reversión transaccional, scope, archivos privados y límites HTTP. Pruebas usan exclusivamente bases PostgreSQL `_test`, con bases temporales propias y limpieza de IDs creados. No SQLite, usuarios ni movimientos de demostración en desarrollo.

La ejecución final independiente de PostgreSQL y Playwright confirmó código 0 sin señal de terminación; Playwright `.last-run.json` terminó en passed sin fallos. Las comprobaciones de tipos y lint se repitieron tras completar las pruebas nuevas.

## Regresiones de cierre

- La lista cortaba 500 solicitudes globales antes de filtrar alcance, ocultando pendientes propios. Prueba con 501 ajenas observada RED→GREEN.
- Una autorización HR ya revocada podía conservar facultad administrativa si el scope se había resuelto antes de esperar bloqueo; revalidación dentro de transacción, también en reintentos, RED→GREEN.
- Retiro descartaba el motivo requerido. Persistencia privada `withdrawal:{reason,actorId,createdAt}` y recarga HTTP/UI RED→GREEN; migración aditiva 0009.
- Avisos de responsables dirigían a solicitudes propias. Destinos por destinatario a `/solicitudes` o `/aprobaciones`, prueba outbox RED→GREEN.
- Asistencia no reconocía cobertura aprobada ni resolución posterior de una incidencia; pruebas iniciales RED→GREEN. Evaluaciones/eventos originales permanecen. Una pareja de marcajes completa conserva resultado COMPLETE, en lugar de convertirse en ausencia autorizada, con regresión RED→GREEN.
- Campo de tabla de antigüedad aceptaba silenciosamente contenido sobrante (`1:12:extra`); prueba UI RED→GREEN.

Los primeros E2E nuevos fallaron porque Chromium no ofrecía el cuerpo al consultar la respuesta capturada y por statement_timeout de la conexión que serializa al director global. Se corrigió a comprobación HTTP y lectura/poll de persistencia por API; el timeout se amplió solo en el cliente de bloqueo de pruebas. Los 22 casos anteriores pasaron en esa ejecución. La siguiente repetición reveló una suposición antigua de bandeja global vacía: con avisos legítimos nuevos a RR. HH. se comprueba el readAt persistido del aviso propio, sin exigir que no existan otros avisos.

## Integración y decisiones

Las ausencias aprobadas cubren únicamente turnos completos; permiso parcial no exime toda la jornada. Vacaciones cubren fechas civiles cargadas al saldo. La justificación resuelve solo su incidencia; aprobar después de generarse falta conserva el original y permite identificar resolución separada. Publicar un turno completamente cubierto devuelve conflicto.

Se admite decidir tarde una solicitud enviada en tiempo; no se inventó vencimiento de aprobación. Cancelaciones deben seguir siendo futuras al decidir director y no devuelven días disfrutados. No hay caducidad automática ni concesiones de saldos históricos. Sin respuesta a las preferencias opcionales de política, se entregó configuración explícita por RR. HH.; debe validar reglas internas y conceder períodos antes del uso operativo.

## Migraciones

`0008_pink_pepper_potts.sql` y `0009_wandering_vector.sql` aplicadas y repetidas en desarrollo `asistencia`, 127.0.0.1:55432, PostgreSQL18.6. Verificación posterior: cero políticas de ausencias, cero solicitudes y cero movimientos; columna withdrawal existente. Pruebas en 127.0.0.1:55433 y bases temporales terminadas en `_test`. No se modificaron las cuentas, empleados ni saldos previos.

## Límites

Cierre funcional web/local de etapas 14–15, sin certificación de producción ni cálculos de nómina. Política empresarial y saldos de apertura no se inventan. Cancelaciones parciales de períodos iniciados, aplicación móvil, biometría/offline y despliegue quedan para sus respectivos alcances posteriores. No SMTP/SMS/push externos, staging, commits, push ni publicación. El árbol previo sin seguimiento se preserva en `setup/base-tecnica`.
