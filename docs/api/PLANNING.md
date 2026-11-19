# Turnos y calendario

## Plantillas y festivos

`GET/POST /api/shift-templates`, `PUT/DELETE /api/shift-templates/:id`. Entrada: `{name,category,modality,startTime,endTime,weekdays,timeZone,active}`. Horas HH:mm; weekdays 1=lunes…7=domingo; zona IANA válida. Cada edición incrementa `version`. Un turno operativo solo admite HOME_OFFICE; uno administrativo, ONSITE. Una plantilla referenciada no se borra: puede desactivarse.

Valores iniciales de negocio, insertados una sola vez por la migración 0006:

- Jornada administrativa presencial: 08:00–17:00, lunes–viernes.
- Operativo 1: 08:00–16:00; operativo 2: 16:00–00:00 del día siguiente; operativo 3: 00:00–08:00. Home office y cobertura de los siete días.

Todos los horarios/días son editables; no se asigna una rotación automáticamente. Editar una plantilla no altera turnos ya publicados. No se recrean valores borrados al reiniciar la API.

`GET/POST /api/holidays`, `PUT/DELETE /api/holidays/:id`: `{name,date}`. Se entrega calendario oficial México 2026–2027: 15 fechas del artículo 74 LFT, incluida jornada electoral federal ordinaria 06-06-2027 confirmada por INE. Sin festivos adicionales de empresa o escolares. Preset con fuentes verificadas en `planning/domain/official-holidays.ts`; [fechas y evidencia](../verification/2026-11-18-official-holidays-attendance.md).

Tras migrar, `pnpm holidays:sync` carga con SUPER_ADMIN activo y auditoría; con varios candidatos usar `pnpm holidays:sync --actor UUID`. La transacción revalida el rol, no duplica fechas coincidentes y revierte ante otra descripción en una fecha oficial. Se conservan herramientas de corrección administrativa; el arranque no vuelve a crear fechas borradas. Verificar fuentes oficiales antes de extender a otros años.

## Asignaciones

- `GET /api/schedule-assignments?from=YYYY-MM-DD&to=YYYY-MM-DD`: extremos inclusivos, máximo 93 días, lectura según alcance.
- `POST /api/schedule-assignments`: `{employeeId,templateId,workDate,kind,locationId?}` crea DRAFT.
- `PUT /api/schedule-assignments/:id`: modifica únicamente borradores.
- `POST /api/schedule-assignments/:id/publish`: publica y genera aviso persistente para la cuenta vinculada.
- `POST /api/schedule-assignments/:id/cancel`: `{reason}`, conserva historial y avisa al afectado.

`kind` es REGULAR o DUTY (guardia). En días festivos se requiere guardia; la guardia permite cobertura fuera de los días regulares de la plantilla. Presencial exige un centro activo autorizado al empleado en esa fecha; home office no lleva centro.

Se conservan fecha civil de inicio, instantes UTC, zona IANA, modalidad y snapshot/version de plantilla. Los cruces de medianoche pasan al día siguiente. Horas inexistentes o ambiguas por cambios de zona/DST se rechazan. Los conflictos del mismo empleado se evalúan como intervalos `[inicio,fin)`; turnos adyacentes son válidos. Borradores/publicados ocupan horario; cancelados lo liberan.

ADMIN/HR gestionan y requieren CSRF. Empleados ven sus turnos; jefaturas/suplentes, su alcance; dirección vigente tiene lectura global, sin escritura automática. Se rechazan empleados inactivos, referencias inválidas, modalidad/categoría incompatibles y conflictos. Publicados no se editan directamente: se cancelan y se crea otro borrador.

La web incluye `/turnos` y `/calendario`, vista mensual y agenda. Los borradores pueden moverse con arrastre y confirmación o editando la fecha en el formulario; esta alternativa también funciona en móvil. La publicación, cancelación y cambios administrativos dejan auditoría transaccional.
