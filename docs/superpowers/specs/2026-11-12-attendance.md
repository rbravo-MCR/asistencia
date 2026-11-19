# Etapa 13: Asistencia

## Alcance autorizado

Entrada/salida contra turnos publicados, evaluación de retardos/faltas/salidas anticipadas/omisiones, historial de intentos, motivo de excepciones y consulta por alcance. No aprobaciones, compensación salarial, app móvil nativa ni sincronización offline (etapas posteriores).

- Hora exclusiva del servidor; el contrato rechaza fechas de marcaje enviadas por cliente.
- Autenticado solo marca su propio empleado activo; ADMIN/HR no pueden suplantar marcajes ajenos. Reportes mantienen alcance actual de empleados/jefatura/dirección.
- Turno publicado explícito; instantes/modalidad/centro del snapshot. GPS obligatorio en entrada Y salida presencial, solo para el centro asignado y autorizado, con política vigente 10/10 configurable. Home office no exige ni guarda GPS. Reutilizar ubicaciones dentro de la misma transacción, sin confiar en IDs de comprobaciones antiguas.
- Eventos originales append-only; solicitudes reintentadas con mismo UUID son idempotentes; reutilizar UUID con otro contenido devuelve409. Un único ENTRY/EXIT aceptado por turno, con exclusión concurrente.
- Tolerancia inicial confirmada por documentos10min: retardo desde el minuto11 (minutos completos > tolerancia). Salida anterior al fin produce incidencia. Ventana inicial propuesta30min antes/120min después, configurable y pendiente de respuesta del usuario. Fuera de ventana o GPS inválido conserva intento rechazado y motivo requerido.
- Entrada tardía/salida anticipada se conservan con incidencia pendiente; no se consideran aprobadas automáticamente. Motivos append-only separados de marcajes. Si falta motivo requerido, bloquear siguiente marcaje hasta capturarlo. Ausencias/omisiones requieren motivo pero no resolución automática.
- Incidencias/evaluaciones separadas de marcajes y con historial. Sin marcas al cierre=ABSENCE; solo entrada=MISSING_EXIT; solo salida=MISSING_ENTRY. No duplicar evaluaciones/avisos al repetir worker/evaluación.
- Política versionada y snapshot por control de turno; su activación inicial es hora servidor de habilitación y el worker no inventa faltas para turnos anteriores. Evaluación explícita/worker usa siempre hora servidor, sin aceptar `now` HTTP.
- Publicados con control de asistencia iniciado no se cancelan para ocultar historial: respuesta409 y revisión posterior. No editar ni borrar marcas/incidencias mediante API.
- Auditoría y outbox atómicas. Avisar al afectado y responsables autorizados sin contactos ni GPS personal. Las incidencias quedan pendientes de revisión del paso14.

## Integración común

Módulo `attendance`, contrato `packages/contracts/src/attendance.ts`, ruta web `/asistencia` y `/incidencias`.

Servicios públicos `createAttendanceService(db,{clock?})` (clock solo dependencia interna de pruebas, nunca HTTP); `registerAttendanceRoutes(app,service,access)`; `service.evaluateDue()` para worker. Root integra registros, migraciones, política inicial y worker.

APIs: GET/PUT `/api/attendance/policy` (PUTADMIN/HR+CSRF crea versión); GET `/api/attendance/me`; POST `/api/attendance/punches` `{assignmentId,direction:ENTRY|EXIT,idempotencyKey:UUID,latitude?,longitude?,accuracy?,reason?}`; GET `/api/attendance/summary?from&to`; GET `/api/attendance/incidents?from&to`; POST `/api/attendance/incidents/:id/reason` `{reason}` solo propio; POST `/api/attendance/evaluate` `{from,to}` ADMIN/HR+CSRF. Fechas de consulta civiles por workDate, máximo93días. Contratos concretos se comunican temprano al frontend/E2E.
