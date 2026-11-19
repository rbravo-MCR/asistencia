# Calendario oficial y falta justificable administrativa

## Configuración aplicada

El usuario confirmó entregar solo calendarios oficiales y aceptar desde las 08:30 el marcaje con falta justificable. En desarrollo se cargaron 15 festivos oficiales y se publicó política de asistencia v2, `administrativeAbsenceMinutes:30`, manteniendo tolerancia 10 y márgenes anteriores. La repetición dejó cero altas y la misma versión v2. Migración `0013_ambitious_tigra.sql` aplicada y repetida con salida 0.

El corte es inclusivo: jornada administrativa que inicia 08:00, entrada 08:29:59.999 genera retardo; 08:30 genera `LATE_ABSENCE`. El evento sigue aceptado si cumple GPS, ventana, identidad y orden, con su hora real conservada. Se aplica a ADMINISTRATIVE del snapshot del turno; los operativos mantienen reglas previas. La política es editable en `/configuracion/asistencia`; vacío desactiva el corte. Políticas y controles históricos no se reescriben.

Se puede registrar motivo y solicitar justificación con aprobación definitiva de jefatura. El motivo solo no aprueba la incidencia. El cierre conserva el resultado de falta tardía y, si falta la salida, también su omisión; evaluación y reintentos no duplican incidencias. Una justificación aprobada conserva marcajes, incidencias y evaluación originales y añade la resolución separada.

## Calendario entregado y fuentes

| Año  | Fechas oficiales cargadas                              |
| ---- | ------------------------------------------------------ |
| 2026 | 01-01, 02-02, 03-16, 05-01, 09-16, 11-16, 12-25        |
| 2027 | 01-01, 02-01, 03-15, 05-01, 06-06, 09-16, 11-15, 12-25 |

Formato mes-día. Se verificó el [artículo 74 de la LFT](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf), texto con reforma indicada 14-05-2026, y la [jornada electoral federal ordinaria de 2027 del INE](https://www.ine.mx/voto-y-elecciones/elecciones-2027/), al 18-11-2026. No se cargaron festivos escolares, bancarios, religiosos adicionales o propios de la empresa. No corresponde transmisión presidencial en estos dos años. El preset vive en `apps/api/src/modules/planning/domain/official-holidays.ts`, con fuentes y fecha de revisión; años posteriores requieren verificar las fuentes y los días electorales aplicables antes de ampliar la entrega.

`pnpm holidays:sync` carga el preset en una transacción auditada con SUPER_ADMIN activo, validado nuevamente dentro de la transacción. Con varios candidatos requiere `--actor UUID`. Repeticiones conservan las fechas ya coincidentes; fechas con contenido diferente detienen/revierten toda la carga, sin sobrescribirlas. No se recrean festivos automáticamente al reiniciar la API. Las herramientas administrativas existentes se conservan para correcciones autorizadas; solo el preset oficial se entrega precargado.

## Conservación y respaldo

- Respaldo previo privado: 30 tablas y 92,885 bytes, fuera del repositorio.
- Carga real del comando: `{created:15,unchanged:0}`, repetida `{created:0,unchanged:15}`. Política v2 publicada mediante servicio con actor real SUPER_ADMIN y auditoría, sin alterar versión previa.
- Hashes de 27 tablas públicas ajenas a festivos, políticas de asistencia y auditoría idénticos antes/después. Hash de las políticas anteriores también idéntico. Conservadas cuentas/credenciales, roles, jefaturas, empleados, solicitudes, saldos, turnos y autorizaciones.
- Sin solicitudes, marcajes, saldos ni jornadas ficticias en desarrollo.
- Respaldo posterior verificado mediante restauración aislada: 30 tablas/93 filas, 95,384 bytes; SHA-256 `f49c328fcdfa7a62e492db95730c493b6f47896dfe1674135f6d6eb277c79beb`. No acredita copia externa de producción.

## Verificación

- Dominio RED→GREEN para corte inclusivo y operativos sin cambios; preset oficial exacto y exclusión de Navidad del conteo de vacaciones.
- PostgreSQL: entrada presencial aceptada con GPS y hora original, idempotencia, omisión de salida adicional, control histórico sin aplicar corte nuevo, límites de configuración y justificación HEAD_ONLY sin alterar eventos.
- Calendario: falta de autoridad y degradación SUPER→ADMIN rechazadas, transacción revertida ante conflicto, carga auditada y repetición sin duplicar. Revisión independiente detectó la revalidación insuficiente del SUPER_ADMIN; corregida con regresión RED→GREEN. Limpieza E2E limitada a IDs creados por su requestId de auditoría.
- `pnpm check`: salida 0, lint/modularidad/formato/tipos, 186 pruebas unitarias/UI y build API/web.
- Integración completa: salida 0, 175 pruebas PostgreSQL en 17 archivos.
- Playwright completo escritorio/móvil: **38/38 aprobados**, salida **0**, 2.6 minutos. Incluye calendario oficial y marcaje presencial con falta tardía, GPS, motivo y eventos conservados. Capturas revisadas en ambos tamaños, sin desbordamiento horizontal.
- Se corrigieron supuestos del harness: etiqueta con estado completo y selector SUPER_ADMIN acotado al correo de su cuenta. Una interrupción SIGTERM143 del wrapper requirió runner con archivo de salida explícito. Otra ejecución reprodujo una carrera real de limpieza de pruebas: una cuenta temporal se borró entre la selección del destinatario y la inserción de outbox. PostgreSQL confirmó la FK y auditoría identificó la cuenta estándar E2E. La limpieza de usuarios ahora toma el mismo lock transaccional del negocio; no se alteró código de producto por ese fallo. La suite completa posterior terminó sin fallos. Lint E2E y tipos de herramientas pasaron después de esos ajustes.

**Total: 399 pruebas aprobadas** (186 unitarias/UI + 175 PostgreSQL + 38 E2E). Formato final correcto y revisión independiente con hallazgos corregidos. Sin commit, staging, push o despliegue.

## Pendientes efectivos

Quedan resueltos los pendientes de festivos de esta entrega y tratamiento del marcaje desde 08:30. Siguen pendientes saldos históricos de vacaciones, vigencias/publicación de jornadas y autorizaciones del centro, validación de permisos por horas contra la jornada, correos/SMTP y destino/validación real de producción. App móvil al final. Este cierre se aplica en desarrollo y no declara producción.

Diagnóstico real posterior: `NO_VACATION_PERIODS:6`, `NO_UPCOMING_SHIFTS:6` y `LOCATION_AUTHORIZATION_REQUIRED:6`; ya no informa ausencia de festivos ni de tipos de permiso. Los pendientes de SMTP/producción y permisos contra jornadas se documentan aparte y no se infieren de ese lector.
