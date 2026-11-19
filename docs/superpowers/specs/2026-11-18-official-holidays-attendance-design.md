# Festivos oficiales y falta justificable desde 08:30

Confirmación del usuario: entregar solo calendarios oficiales para festivos y aceptar el marcaje desde 08:30 como falta justificable. Continúa la ejecución directa del cierre operativo ya autorizada.

## Decisiones

Reutilizar calendario y política versionada, en lugar de crear otro módulo o fijar 08:30 universalmente. La política tendrá `administrativeAbsenceMinutes` nullable, inicialmente 30 para la jornada administrativa de 08:00. Solo aplica a la categoría ADMINISTRATIVE congelada en el turno; los operativos/nocturnos mantienen reglas actuales. A los 30 minutos inclusive se acepta el marcaje si cumple ventana, identidad y GPS y se genera `LATE_ABSENCE`. Se conserva la hora real y se admite motivo/justificación con decisión definitiva de jefatura. Motivo no aprueba automáticamente.

Los controles existentes conservan su snapshot: campos ausentes/null desactivan el nuevo corte. La evaluación cerrada distingue falta por llegada tardía de falta sin marcajes; conserva omisiones adicionales y no duplica incidencias. No se eliminan faltas/horas originales después de aprobar una justificación. Una entrada aceptada nunca se convierte en rechazo por este corte.

Calendario entregado 2026–2027: descansos nacionales del artículo 74 LFT, más jornada electoral federal ordinaria 06-06-2027 confirmada por INE. Fuentes: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf y https://www.ine.mx/voto-y-elecciones/elecciones-2027/ , consultadas 18-11-2026. Siete fechas en 2026 y ocho en 2027. Sin días escolares, bancarios/religiosos adicionales ni festivos empresariales. No se extrapolan elecciones futuras ni se certifican calendarios posteriores a 2027.

Se entrega preset versionado y comando de carga auditada `pnpm holidays:sync`; usa SUPER_ADMIN real de mantenimiento, revalida autoridad y aplica en transacción, sin duplicar ni sobrescribir fechas conflictivas. Se conservan herramientas administrativas existentes para correcciones autorizadas; «solo oficiales» define el calendario entregado. No se borran registros previos. En desarrollo no existen festivos previos.

## Aceptación

Límites 08:29:59.999/08:30/08:31, entrada aceptada, GPS sin cambios, operativos sin nuevo corte, política histórica conservada, salida y evaluación sin duplicados, justificación real HEAD_ONLY y eventos inmutables. Calendario exacto, carga repetida sin cambios, festivo no cargado a vacaciones y publicación regular bloqueada en festivo. Check, PostgreSQL y E2E de escritorio/móvil; respaldo previo y conservación de tablas ajenas.
