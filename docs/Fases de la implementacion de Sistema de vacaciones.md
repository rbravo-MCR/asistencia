## Fases de la implementacion de Sistema de vacaciones

**Primera entrega funcional**

Estado: puntos 1–7 completados y verificados localmente. Ver `docs/verification/2026-11-12-departments-vertical-slice.md`.

1. **Incorporar TanStack Router:** rutas, layout común, navegación y página 404.
2. **Definir Departamentos:** campos mínimos, validaciones y contratos.
3. **Implementar persistencia:** esquema Drizzle y migración PostgreSQL.
4. **Crear API de Departamentos:** creación, consulta y manejo de errores.
5. **Crear pantalla de Departamentos:** listado, formulario y estados de carga, vacío, error y éxito.
6. **Verificar el flujo completo:** React → Fastify → PostgreSQL, con pruebas y compilación.
7. **Actualizar documentación:** rutas, endpoints, comandos y resultados.

**Siguientes etapas**

8. **Identidad y acceso:** usuarios, sesiones, roles y permisos por departamento.
9. **Empleados y responsables:** expedientes, jefaturas, director y suplencias.
10. **Auditoría y notificaciones:** trazabilidad y entrega persistente de avisos.
11. **Turnos y calendario:** horarios configurables, tres turnos operativos, fines de semana y guardias en festivos.
12. **Ubicaciones:** centros de trabajo y geolocalización obligatoria para marcajes presenciales. coordenadas gps 21.0364532482013, -89.62273424224803
13. **Asistencia:** entrada y salida para presencial y home office; retardos, faltas e incidencias.
14. **Aprobaciones:** decisión definitiva de jefatura para solicitudes nuevas; flujo jefe/director conservado solo para solicitudes históricas.
15. **Vacaciones, permisos y justificaciones:** políticas, saldos trazables, evidencias y cancelaciones.
16. **Aplicación móvil:** consulta de turnos, marcajes, solicitudes y sincronización offline.
17. **Dashboard y configuración administrativa.**
18. **Preparación de producción:** seguridad, respaldos, restauración, monitoreo y despliegue.

**Decisiones pendientes antes de sus módulos**

- Radio confirmado: 10 m. Precisión máxima inicial configurable: 10 m.
- Validar operativamente ventana de entrada anticipada/salida posterior (inicial propuesta 30/120 min).
- Uso obligatorio u opcional de biometría nativa.
- Validación IP/DDNS como control adicional.
- Rotación de empleados entre turnos.
- Tratamiento de marcajes offline.
- Políticas de vacaciones y excepciones de aprobación.

Etapas 8 y 9 completadas: identidad/acceso y empleados/responsables. Evidencia: `docs/verification/2026-11-12-identity-employees.md`.

Etapas 10–12 completadas: auditoría/avisos internos, turnos/calendario y ubicaciones. Evidencia: `docs/verification/2026-11-12-steps-10-12.md`.

Etapa 13 completada y verificada localmente: asistencia; ver `docs/verification/2026-11-13-attendance.md`.

Etapas 14–15 completadas y verificadas localmente: aprobaciones de jefe/director; vacaciones, permisos y justificaciones con libro de movimientos y evidencias privadas. Ver `docs/verification/2026-11-13-approvals-leave.md`.

Por decisión del usuario, **Aplicación móvil (16) se deja al final**. Se implementa primero **Dashboard y configuración administrativa (17)**; luego configuración operativa real y preparación de producción (18).

Etapa 17 completada y verificada localmente el 17 de noviembre de 2026: dashboard por alcance, configuración administrativa y diagnóstico. Evidencia: `docs/verification/2026-11-17-dashboard-configuration.md`. El siguiente trabajo acordado es completar la configuración operativa real; después preparar producción. La app móvil permanece al final.

Configuración operativa del 18-11: permisos por horas con goce configurable, festivos oficiales México 2026–2027 y corte administrativo justificable desde08:30 aplicados en desarrollo. Evidencia: `docs/verification/2026-11-18-official-holidays-attendance.md`. Faltan saldos históricos, vigencias de jornadas/centro, permisos contra jornada, correos y producción; no se declara completada la etapa18.
