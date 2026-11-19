# Aprobación definitiva de jefatura

**Resultado: implementado y verificado localmente. 354 pruebas aprobadas.**

## Cambio autorizado

El usuario confirmó que la aprobación laboral de jefatura es definitiva. Las solicitudes nuevas pasan de PENDING_HEAD a APPROVED con una decisión válida de jefatura/suplencia, o del superior explícito cuando solicita el propio jefe. No requieren visto bueno del CEO/director.

La administración de accesos de usuarios permanece separada. ADMIN, HR y lectura global del CEO no conceden autoridad laboral automática ni autoaprobación.

## Implementación

- `approval_flow` persistido y congelado por solicitud. Creación HTTP actual HEAD_ONLY; el cliente no puede elegir el flujo.
- Migración 0010: filas anteriores HEAD_DIRECTOR, nuevas HEAD_ONLY. Conserva estados/decisiones y no aprueba solicitudes durante la migración.
- Decisión final y efectos en una transacción: consumo de vacaciones, resolución por referencia de una incidencia o cancelación/reintegro de una ausencia futura.
- Reserva liberada por rechazo/retiro; reintentos y concurrencia conservan una sola decisión y efecto.
- Autoridad vigente y cuenta/empleado activos comprobados en servidor; motivos, evidencias privadas, auditoría y avisos internos conservados.
- Diagnóstico de operación actual exige jefatura o superior activo distinto del solicitante, sin bloquear por dirección faltante.
- Pantallas distinguen resolución definitiva de jefatura de los flujos históricos y conservan sus decisiones.

## Pruebas y revisión

Pruebas nuevas PostgreSQL: creación/aprobación sin director, consumo concurrente, rechazo/retiro, cancelación con reintegro único, cancelación iniciada antes de decidir sin devolución, justificación real sin alterar eventos, solicitud del jefe por superior, superior inactivo, jefatura revocada, flujo histórico, migración con filas previas y nuevas, HTTP401/CSRF403 y rechazo del flujo elegido por cliente. Fixtures históricos conservan las regresiones del circuito anterior de dos pasos con versión explícita de servidor.

La revisión independiente identificó mensajes de éxito que todavía exigían dirección. La regresión UI falló antes y pasó tras corregir mensajes de autorización/cancelación y explicación de justificación. Otra prueba reveló decisiones históricas en orden aleatorio cuando compartían fecha exacta: ahora el desempate mantiene HEAD antes de DIRECTOR sin modificar los eventos.

Pruebas dirigidas: 13 PostgreSQL y 13 UI aprobadas. Revisión posterior sin otros P1/P2 concretos identificados.

- Verificación raíz: `pnpm check`, salida 0; 172 pruebas unitarias/UI, lint, límites modulares, formato, tipos y compilación correctos.
- Integración completa: `pnpm test:integration`, salida 0; 152 pruebas PostgreSQL en 14 archivos.
- Navegador completo: 30 recorridos escritorio/móvil aprobados, salida 0 y `.last-run.json` passed sin fallos. Se comprobaron aprobación y cancelación con una sola firma de jefatura, consumo/reintegro únicos y ausencia de acción de dirección para el flujo nuevo. Capturas de cancelación y saldo inspeccionadas en escritorio/celular, sin desbordamiento horizontal.
- Migración de desarrollo: aplicada y repetida con salida 0. Historial con 11 migraciones, `approval_flow` NOT NULL y predeterminado HEAD_ONLY; cero solicitudes en desarrollo y roles del propietario ADMIN/EMPLOYEE conservados.

## Límites

No se asignaron responsables, correos, turnos, políticas empresariales o saldos no confirmados. El cambio de corte de asistencia a las 08:30 requiere precisar el tratamiento del marcaje posterior y no forma parte de esta entrega. No app móvil, otro rol técnico, publicación ni certificación de producción. Se conserva el árbol previo sin seguimiento y no se crea un commit inicial que mezcle trabajo existente.
