# Permisos anticipados por horas

Decisiones confirmadas por el usuario: permisos de entrada tardía y salida anticipada, solicitados al menos 24 horas antes del inicio de la ausencia, con motivo obligatorio, sin comprobante obligatorio y con goce de sueldo configurable. Jefatura conserva la decisión definitiva. Se continúa la ejecución directa autorizada del cierre operativo.

## Enfoque

Reutilizar el catálogo versionado existente y su opción `paid`, en lugar de añadir otra política global o fijar el sueldo en código. Añadir `minimumNoticeHours` y `partialOnly` configurables por tipo. Crear en desarrollo dos tipos: Entrada tardía y Salida anticipada, activos, con goce, evidencia no obligatoria, intervalos parciales obligatorios y anticipación 24. Los cambios de configuración afectan nuevas solicitudes; las anteriores conservan su snapshot.

El intervalo representa la ausencia: desde el inicio de jornada hasta la entrada prevista, o desde la salida prevista hasta el fin de jornada (17:00 en la jornada administrativa actual). No convertir las 17:00 en una constante para todos los turnos. Se conserva la captura de fechas/horas existente y su validación civil America/Merida; esta entrega no añade un motor de nómina ni valida el intervalo contra jornadas aún no publicadas.

La API exige las 24 horas con hora del servidor, admite exactamente el límite y no permite omitir horas para los tipos por horas. Para tipos generales que admitan días completos, el aviso se cuenta desde medianoche civil de Mérida. Campos omitidos por clientes antiguos conservan la configuración anterior; tipos nuevos genéricos omiten ambas restricciones hasta configurarlas. La migración no modifica permisos históricos ni crea datos de negocio.

Vacaciones mantienen la política LFT ya publicada y las concesiones explícitas por aniversario. No crear saldos históricos sin conocer vacaciones utilizadas.

## Aceptación

Pruebas PostgreSQL de límite 24 h/menos de 24 h, motivo vacío, intervalo omitido, cambio de goce y snapshot previo; UI que muestra condiciones y permite editarlas. Migración aplicada/repetida, dos tipos configurados mediante servicio auditado y actor autorizado, sin solicitudes ficticias. Check, integración y E2E completos, con evidencia y límites operativos pendientes.
