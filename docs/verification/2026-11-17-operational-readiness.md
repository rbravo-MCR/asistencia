# Configuración operativa y preparación de producción

## Configuración aplicada en desarrollo

Se publicó la política Vacaciones LFT v1 mediante el servicio de solicitudes y la cuenta SUPER_ADMIN autorizada, con auditoría. Se verificó escala de 24 reglas de antigüedad y 12 días en el primer año, calendario administrativo lunes–viernes y exclusión de festivos registrados. El calendario operativo de cobertura semanal requiere revisar descansos individuales antes de incorporar personal operativo; actualmente no hay personal en esa categoría. La referencia legal se revisó en el [artículo 76 del texto vigente de la Cámara de Diputados](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf), reforma indicada 14-05-2026.

Repetir la aplicación confirmó `created:false`, misma versión e igual contenido. Las comparaciones de tablas protegidas confirmaron conservación de cuentas/credenciales, roles, expedientes, jefaturas, solicitudes, movimientos de vacaciones, política de asistencia, jornadas y autorizaciones de centro. No se concedieron períodos o saldos a partir de la antigüedad ni se generaron marcajes o solicitudes ficticias en desarrollo.

## Recuperación de datos

Se incorporó `pnpm db:backup create DIRECTORIO` y `pnpm db:backup verify ARCHIVO.dump`. El dump usa snapshot PostgreSQL compartido con los recuentos; archivos 0600 en directorio privado 0700 fuera del repositorio. Verificación SHA-256 y restauración aislada en un nombre generado de postgres-test; nunca sobre la base real. Los clientes se obtienen de los contenedores PostgreSQL 18.6.

Dos rondas reales: respaldo previo de 30 tablas públicas/51 filas, y posterior de 30 tablas/54 filas. En ambos casos la restauración coincide con los recuentos del snapshot. El respaldo posterior ocupa 91,842 bytes. Los archivos están bajo `/home/rafael/.local/state/asistencia/backups`; no contienen datos de prueba insertados en desarrollo y no se incluyen en Git.

La revisión encontró un fallo al borrar una restauración cancelada con conexiones residuales. Se reprodujo en PostgreSQL (DROP ordinario agotó el timeout) y corrigió con cancelación/espera del cliente y DROP WITH FORCE, limitado estrictamente a nombres temporales generados. La regresión mantiene un backend activo con pg_sleep, elimina la base y verifica rechazo de nombres de desarrollo/pruebas ordinarios. La revisión posterior no encontró P1/P2 pendientes en ese alcance.

Esto acredita recuperación local. No hay copia externa cifrada, retención ni restauración del servidor de producción verificadas.

## Configuración de producción

`parseConfig` ahora rechaza APP_ORIGIN HTTP en modo production. La prueba pasó por RED/GREEN y el fixture HTTP de producción usa HTTPS. No se habilitó un sitio público ni se alteraron credenciales.

Ver [operación y producción](../PRODUCTION.md) para ejecutar con archivo externo, migraciones, proxy/origen y límites de los avisos. Actualmente los avisos son internos: no existe transporte SMTP ni archivo externo de correos identificado.

## Pendientes efectivos de datos

El diagnóstico posterior a publicar LFT dejó de reportar LEAVE_POLICY_REQUIRED y no reporta problemas de jefaturas, cuentas vinculadas o cadena de aprobación. Persiste:

| Pendiente                  | Estado                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Tipos de permiso           | Ninguno activo; falta catálogo/requisitos autorizado                                                         |
| Períodos de vacaciones     | 6 empleados sin concesiones; falta respaldo RR. HH. de períodos y saldos utilizados/disponibles              |
| Jornadas próximas          | 6 empleados sin publicación; falta fecha de inicio y vigencias                                               |
| Centro presencial          | 6 empleados sin autorización vigente; falta vigencia autorizada                                              |
| Festivos                   | Ninguno cargado; falta calendario aplicable                                                                  |
| Corte de falta desde 08:30 | Se solicitó confirmar conservación/rechazo del marcaje; no implementado ni activado mientras falta respuesta |
| Correos                    | Falta ruta/contenido del archivo externo y definición direcciones/SMTP                                       |
| Producción                 | Sin servidor/dominio/TLS, credenciales y respaldo externo verificados                                        |

La app móvil permanece al final. La aprobación definitiva HEAD_ONLY y el SUPER_ADMIN de Rafael se conservan. El resultado no cierra los puntos dependientes de datos aún no proporcionados.

## Verificación final

- `pnpm check`: salida 0; lint, arquitectura, formato, tipos, 179 pruebas unitarias/UI y compilación API/web.
- `pnpm test:integration`: salida 0; 166 pruebas PostgreSQL, incluida la limpieza con backend activo y marcaje/incidencia/justificación/aprobación HEAD_ONLY preservando eventos originales.
- Playwright completo: salida 0; 32 recorridos escritorio/móvil, incluidas vacaciones/cancelación, permisos con evidencia, GPS, roles y SUPER_ADMIN.
- Total: **377 pruebas aprobadas**. Revisión independiente sin P1/P2 pendientes después de la corrección.
- Restauración posterior real: 30 tablas/54 filas; SHA-256 `cb609c3a449c22e190463049acf3eb561934d8aa1f5622826224f33d3e9cbd9b`. Cero bases `restore_UUID_test` residuales tras las verificaciones.

Dictamen de producción: **NO-GO** hasta completar los datos operativos y el destino real. La parte independiente de esos datos queda implementada y verificada; las preguntas operativas siguen pendientes de respuesta.

## Actualización posterior, 18-11-2026

El catálogo de permisos ya tiene Entrada tardía y Salida anticipada: por horas, con 24 horas de anticipación, motivo obligatorio, sin comprobante obligatorio y con goce configurable. Este punto sustituye el pendiente «Tipos de permiso» de la tabla histórica anterior. Los períodos de vacaciones siguen la política LFT publicada; falta conocer vacaciones ya utilizadas para conceder/ajustar saldos históricos. Ver [cierre de permisos por horas](2026-11-18-hourly-permissions.md). Los demás pendientes operativos y de producción se conservan.

Posteriormente se resolvieron calendario y corte: 15 festivos oficiales LFT/INE 2026–2027 cargados y política de asistencia v2 con falta administrativa justificable desde 30 minutos después de entrada (08:30 para 08:00), conservando el marcaje aceptado y la hora original. Ver [cierre y fuentes](2026-11-18-official-holidays-attendance.md). No vuelven a requerir definición; los pendientes efectivos son saldos históricos, jornadas/centro, permisos contra jornadas, correos y producción.
