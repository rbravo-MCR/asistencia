# Permisos anticipados por horas

## Configuración efectiva en desarrollo

Por confirmación del usuario, los tipos Entrada tardía y Salida anticipada están activos con `paid:true`, `evidenceRequired:false`, `allowPartial:true`, `partialOnly:true` y `minimumNoticeHours:24`. Motivo obligatorio y aprobación definitiva de jefatura. El intervalo indica horas de ausencia; salida hasta las 17:00 en la jornada administrativa actual, sin convertir ese horario en regla universal.

El goce se puede cambiar en `/politicas-ausencias` por administración autorizada. Cada solicitud conserva versión y condiciones originales; las nuevas usan la configuración vigente. Exigir horas impide eludir la anticipación omitiendo los extremos. La validación del aviso usa hora del servidor y acepta exactamente el límite de 24 horas. Los permisos no consumen vacaciones ni calculan descuentos de nómina.

## Aplicación y conservación

- Migración `0012_chunky_kingpin.sql` aplicada y repetida en PostgreSQL de desarrollo con salida 0. Solo añade restricciones/columnas al catálogo; valores históricos 0/false, sin alterar solicitudes.
- Respaldo previo privado: 30 tablas, 91,842 bytes, fuera del repositorio bajo `/home/rafael/.local/state/asistencia/backups`.
- Los dos tipos se crearon mediante `savePermissionType` y el único SUPER_ADMIN activo autorizado, con contexto y actor auditados. Repetición sin cambios: ambos siguen en versión 1.
- Hashes de las 27 tablas públicas ajenas a catálogo, operaciones idempotentes y auditoría idénticos antes/después. Conservadas cuentas, credenciales, roles, empleados, jefaturas, políticas, saldos, solicitudes, jornadas y centros. No se generaron solicitudes, marcajes o saldos ficticios.
- Respaldo posterior de 92,885 bytes restaurado en aislamiento: 30 tablas/60 filas coinciden con su snapshot, SHA-256 `baa487d730bea1ceb13ba1b630205d5a11ed635b12bc091fe8bab8dc606f90f4`. Recuperación local comprobada; no acredita respaldo externo de producción.
- El primer intento local abortó al validar un identificador de auditoría que no era UUID; transacción revertida. Se corrigió el contexto al formato UUID y las dos aplicaciones posteriores finalizaron correctamente.

## Regresiones y revisión

RED→GREEN PostgreSQL: rechazo a 23:59:59.999, aceptación exactamente a 24 h, motivo vacío, intervalo omitido, goce original frente a edición, restricciones conservadas cuando un cliente antiguo omite campos y rechazo de configuración contradictoria. Medianoche civil de Mérida frente a hora UTC; los tipos históricos sin aviso siguen admitiendo su comportamiento anterior.

Revisión independiente encontró un reintento histórico cuya respuesta idempotente carecía de los campos nuevos y podía producir 500 al serializar. Regresión RED→GREEN: se normaliza con 0/false históricos sin leer condiciones posteriores. También se corrigió el formulario genérico para iniciar sin aviso, y una etiqueta contradictoria sobre jornadas completas. Pruebas focalizadas finales: 21 PostgreSQL y 16 UI aprobadas.

## Verificación completa

- `pnpm check`: salida 0; lint, modularidad, formato, tipos, 182 unitarias/UI y build API/web.
- Integración completa PostgreSQL: salida 0; 169 pruebas en 16 archivos.
- Playwright completo: **34/34 aprobados**, salida 0, escritorio y móvil. La primera ejecución aprobó 30/34; se corrigieron dos supuestos de fixtures repetidos en ambos tamaños: jornada anterior a activación en base reciente y zona de navegador asumida UTC. El fixture ahora inicia en la hora del servidor y los actores del recorrido de permisos usan explícitamente America/Merida, con captura 08:00–09:00 y persistencia 14:00–15:00 UTC. Tipos/lint de los archivos E2E corregidos pasan; no se cambió código de producto por esos fallos. Capturas de la solicitud revisadas en ambos tamaños, sin desbordamiento horizontal.
- Avisos conocidos de jsdom `scrollTo` y variables de color, sin fallos en check/integración.

Total: **385 pruebas aprobadas**. Revisión independiente y hallazgos corregidos. El diagnóstico de solicitudes dejó de informar `PERMISSION_TYPES_REQUIRED`; conserva `NO_VACATION_PERIODS`.

## Límites y siguientes pendientes

Este cierre configura desarrollo; no es despliegue ni certificación de producción. La captura de horas valida el intervalo y las fechas civiles, pero no añade anclaje contra una jornada publicada. Los comprobantes siguen siendo opcionales, no obligatorios.

La confirmación de períodos conforme a LFT conserva la política publicada. Falta el consumo previo de cada empleado para establecer saldos históricos disponibles. Siguen pendientes fechas/vigencias de jornadas y centro, festivos, tratamiento del marcaje desde 08:30, correos/SMTP y destino real de producción. App móvil al final.

Actualización posterior del mismo día: festivos oficiales 2026–2027 y corte desde 08:30 con marcaje aceptado/falta justificable ya están configurados. La lista anterior conserva el cierre histórico de permisos; ver [estado vigente](2026-11-18-official-holidays-attendance.md).
