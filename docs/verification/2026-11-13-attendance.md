# Etapa 13: Asistencia — verificación local

**Resultado: etapa 13 cerrada en alcance web/local. 264 pruebas aprobadas.**

## Entrega

Entrada/salida propia contra turnos publicados con hora exclusiva del servidor, UUID idempotente y exclusión concurrente. Eventos originales, motivos y evaluaciones separados; política versionada y congelada por control. Presencial valida GPS fresco al entrar y salir dentro de la transacción contra el centro asignado/autorizado. Home office no solicita ni guarda comprobaciones GPS, aunque el cliente envíe coordenadas.

Historial e incidencias por alcance, agrupadas por empleado/fecha civil/horario del turno. Retardos desde minuto completo 11 con tolerancia inicial 10 min, salidas anticipadas, ausencias y omisiones. Motivos obligatorios antes del siguiente marcaje, sin aprobación automática. Turnos con control iniciado no se cancelan para ocultar historial. Auditoría/outbox atómicas y avisos internos recuperables e idempotentes.

## Verificación realizada el 13 de noviembre de 2026

| Comprobación                                     | Resultado                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `pnpm check`                                     | 142 unitarias/UI; lint, modularidad, formato, tipos y build OK                    |
| `pnpm test:integration`                          | 100 pruebas PostgreSQL OK                                                         |
| `node node_modules/@playwright/test/cli.js test` | 22 pruebas escritorio/móvil aprobadas                                             |
| Revisión independiente                           | Dos P2 de interfaz corregidos y probados RED→GREEN; sin otros P1/P2 identificados |

La repetición completa mediante el ejecutable directo de Playwright terminó con código 0, `22 passed` y `.last-run.json` en estado passed. La ejecución previa vía `pnpm test:e2e` también reportó 22 casos aprobados, pero el lanzador terminó con señal 143 al cerrar servidores; no se contó esa salida como comando exitoso. La ejecución directa usa la misma configuración y suite, con contratos ya compilados por `pnpm check`.

La integración comprueba sesiones/CSRF, permisos, marcajes ajenos, rechazo de fechas del cliente, duplicados concurrentes, conflicto UUID con contenido distinto, snapshots, turnos nocturnos, instante exacto de cierre, faltas/omisiones sin duplicación, no inventar ausencias históricas y rollback de negocio/auditoría. Una prueba arranca los workers reales de Fastify: evaluación automática de turno vencido, generación de falta y entrega de aviso a bandeja exactamente una vez. El cierre manual conserva actor y el worker identidad sistema.

Se inspeccionaron capturas de asistencia e incidencias en escritorio y móvil; las pruebas comprueban ausencia de desbordamiento horizontal. E2E valida hora servidor, home office sin solicitud ni persistencia GPS, entrada y salida presenciales rechazadas fuera de geocerca y aceptadas con nueva lectura del centro, motivos persistidos y conservación de intentos originales.

## Correcciones de cierre

- Home office creaba filas `geo_checks` con resultado NOT_REQUIRED: ahora no crea filas y devuelve `geoCheckId:null`. Prueba HTTP observada fallando con dos filas frente a cero y pasando tras la corrección. Dos expectativas del test de servicio se alinearon con la especificación de no persistir comprobaciones home office.
- El historial usaba fecha UTC y abría mañana después de las 18:00 de Mérida. Regresión a `2026-11-14T01:00:00Z`, esperando `2026-11-13`, observada RED→GREEN.
- Las tarjetas de incidencias no identificaban al empleado/turno. Se agrupan usando el resumen ya autorizado, sin ampliar alcance ni exponer GPS. Prueba con dos empleados/fechas observada RED→GREEN.
- E2E esperaba un label exacto que incluía texto de las opciones del select. La traza mostró bloqueo antes del primer marcaje; se usa el rol/nombre accesible del combobox. La repetición reportó los 22 casos aprobados. Se limpiaron exclusivamente los cuatro usuarios/empleados/turnos de pruebas fallidas identificados por sus trazas en `_test`.
- Una prueba HTTP esperaba 404 para una cuenta sin empleado vinculado. Se corrigió a 403, coherente con `OWN_EMPLOYEE_REQUIRED`; la autorización del servicio no se debilitó.

## Migración y configuración

Node 26.13.1; PostgreSQL 18.6. Desarrollo `asistencia` en 127.0.0.1:55432, pruebas `asistencia_test` en 127.0.0.1:55433 y bases temporales propias terminadas en `_test`. Migración `0007_free_morg.sql` aplicada y repetida sin restablecer políticas existentes. Activación inicial en desarrollo: `2026-11-13T17:31:17.160Z`. No se añadieron usuarios, empleados ni marcajes de demostración en desarrollo.

Política inicial: tolerancia 10 min; anticipación de entrada 30 min y margen posterior de salida 120 min. Estos dos márgenes se conservan como valores propuestos configurables; su validación operativa sigue pendiente. La activación impide que el worker invente faltas anteriores sin control iniciado. `ATTENDANCE_WORKER_ENABLED` y `ATTENDANCE_EVALUATION_INTERVAL_SECONDS` documentados en `.env.example` y desarrollo.

## Límites

Cierre de la etapa web/local; no certificación de producción. Aprobaciones jefe/director corresponden a etapa 14; evidencias y políticas de vacaciones/permisos a etapa 15; biometría nativa y sincronización offline a etapa 16. No hay SMTP/SMS/push externos. Se preservó el árbol previo sin seguimiento en rama `setup/base-tecnica`, sin commits, staging, push ni publicación. Las pruebas usan coordenadas del navegador de pruebas, nunca ubicación personal del operador.
