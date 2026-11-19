# Aprobación laboral definitiva de jefatura

## Decisión autorizada

El usuario distinguió permisos laborales de permisos de usuarios y confirmó: la aprobación de jefatura es definitiva. Esta decisión sustituye la exigencia anterior de visto bueno del director para solicitudes nuevas. Rafael conserva el acceso administrativo global concedido; CEO y administración no adquieren autoridad laboral automática por su acceso global.

## Diseño

Las solicitudes nuevas guardan `approvalFlow: HEAD_ONLY`. La autorización vigente de jefatura/suplencia, o superior explícito para solicitudes del propio jefe, resuelve definitivamente y aplica consumo de vacaciones, resolución de incidencias o cancelación/reintegro en la misma transacción. Rechazar/retirar libera reservas. No autoaprobación, autoridad vencida/revocada, doble consumo ni cambios de eventos originales. RR. HH. recibe avisos internos.

Se consideraron cambiar todos los registros existentes y versionar el flujo por solicitud. Se elige versionar: la migración marca los registros anteriores HEAD_DIRECTOR, conserva sus decisiones/estados y deja HEAD_ONLY como predeterminado nuevo. No se aprueban ni consumen solicitudes durante la migración. Desarrollo tiene cero solicitudes al inspeccionarlo.

`approvalFlow` es dato de servidor, nunca un campo que pueda elegir el cliente. El constructor del servicio admite versión de creación explícita para fixtures/importación compatible del flujo histórico; la composición HTTP usa siempre el valor actual HEAD_ONLY. Las solicitudes históricas pendientes se resuelven con su flujo guardado.

Los diagnósticos de configuración para la operación actual verifican jefatura o superior activo distinto del solicitante, sin exigir una dirección adicional. Se mantiene la lectura global autorizada del CEO y administradores. La administración de usuarios conserva sus permisos actuales.

## Pantallas y contrato

Responder con la versión del flujo. La propiedad es opcional para compatibilidad de clientes/fixtures previos, y el servidor actual la entrega siempre. Mostrar aprobación definitiva para HEAD_ONLY y flujo histórico jefe/director para HEAD_DIRECTOR. Conservar historial de pasos anteriores y acciones calculadas por servidor; no mostrar una decisión de director en solicitudes nuevas.

## Verificación

PostgreSQL aislado `_test`: sin director, decisión final, rechazo/retiro, reservas concurrentes y efectos idempotentes, cancelación todavía futura al decidir, justificación sin reescribir marcajes, autoridad revocada y superior explícito sin autoaprobación. Probar migración con filas previas y flujo histórico. HTTP autenticado/CSRF y rechazo de flujo enviado por cliente. UI y E2E real empleado → jefe con consumo/reintegro inmediato y sin segunda firma. Ejecutar suites completas, revisar cambios independientemente y aplicar migración de desarrollo tras verificar.

No asignar jefaturas o correos no confirmados, publicar jornadas, inventar saldos, cambiar reglas de las 08:30, crear otro rol técnico ni desplegar como parte de esta modificación.
