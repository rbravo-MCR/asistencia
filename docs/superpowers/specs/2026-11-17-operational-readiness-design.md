# Cierre operativo y preparación de producción

Autorización: el usuario pidió «dale con todo» sobre asistencia, vacaciones/permisos y prueba operativa/producción. La app móvil permanece al final. Ejecución directa, sin otra ronda de autorización para los cambios ya pedidos.

## Decisiones

Se conserva Fastify/Drizzle/PostgreSQL, React y los servicios existentes. Se descartan SQL de negocio directo y migraciones con saldos ficticios. La configuración se aplica mediante servicios auditados con actor SUPER_ADMIN activo real. La política LFT confirmada se publica con escala del archivo verificado contra artículo 76, calendario administrativo lunes–viernes y calendario operativo todos los días como ámbito de rotaciones (sin personal operativo actual); excluye festivos registrados. No se deducen saldos disponibles de la antigüedad. No se publican jornadas retroactivas ni se autorizan centros sin vigencia confirmada.

Respaldo: usar cliente PostgreSQL 18.6 de los contenedores ya disponibles; el cliente host no está instalado. Crear archivo custom con checksum y permisos privados fuera del repositorio; restaurar exclusivamente en una base temporal generada en postgres-test, validar estructura y recuentos, eliminar solo esa base temporal. Nunca restaurar encima de desarrollo/producción. Un respaldo local no equivale a copia externa ni política de retención de producción.

Producción: rechazar origen HTTP en modo production; preparar instrucciones y variables externas. No inventar SMTP, destinos de despliegue ni certificados. No enviar correos sin configuración/destinatarios autorizados. Realizar pruebas completas en PostgreSQL aislado y diagnóstico actual de desarrollo.

## Información pendiente

Se solicitó confirmar conservación/rechazo del marcaje desde 08:30, fecha de inicio de jornadas, saldos de RR. HH., tipos de permiso y archivo externo de correos. Las acciones dependientes esperan esa información; el resto continúa. Los permisos laborales mantienen HEAD_ONLY y SUPER_ADMIN no implica autoridad aprobadora.

Confirmaciones posteriores del 18-11: permisos por horas con aviso24 y goce configurable, calendario exclusivamente oficial y entrada desde08:30 aceptada con falta justificable. Se implementaron en las entregas `2026-11-18-hourly-permissions` y `2026-11-18-official-holidays-attendance`; no volver a pedir estas definiciones. Continúan pendientes jornadas/centro, saldos usados y correos.

## Aceptación

Política LFT publicada una vez y verificable, sin alterar saldos/solicitudes. Backup real restaurado y comprobado en aislamiento; corrupción rechazada. Configuración production exige HTTPS. Pruebas unitarias, integración y E2E verdes, revisión independiente, diagnóstico y límites de producción explícitos.
