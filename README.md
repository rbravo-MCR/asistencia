# Asistencia · MCR

Sistema interno de gestión de personal para una empresa. Monolito modular con Fastify, Drizzle y PostgreSQL; panel React con Vite, Tailwind CSS y componentes shadcn/ui.

La **primera entrega funcional de Departamentos está completa**: navegación, dominio, contratos, persistencia, API y pantalla con CRUD y estados de carga, vacío, error y éxito. También están completas las etapas 8 y 9: identidad/acceso, expedientes de empleados y responsables. También están implementadas las etapas 10–12: auditoría y avisos internos persistentes, turnos/calendario y centros con validación GPS. La etapa 13 incorpora entrada/salida, historial, incidencias y motivos pendientes de revisión. Las etapas 14–15 incorporan solicitudes de vacaciones, permisos y justificaciones, con saldos y evidencias privadas. La aprobación de jefatura es definitiva para solicitudes nuevas; las anteriores conservan su flujo histórico. La etapa 17 incorpora dashboard por alcance y configuración administrativa central; la aplicación móvil (16) se pospone al final por decisión del usuario.

## Inicio local

Requisitos: Node **26.13.1**, pnpm **12.18.0** y Docker Compose.

```bash
nvm install
nvm use
npm install --global pnpm@12.18.0
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm admin:create
pnpm dev
```

Si `.env` ya existe, conservarlo y revisar las variables faltantes en `.env.example`.

- Inicio y dashboard: <http://127.0.0.1:5173>
- Configuración administrativa: <http://127.0.0.1:5173/configuracion>
- Política de asistencia: <http://127.0.0.1:5173/configuracion/asistencia>
- Ingreso: <http://127.0.0.1:5173/ingresar>
- Empleados: <http://127.0.0.1:5173/empleados>
- Responsables: <http://127.0.0.1:5173/responsables>
- Departamentos: <http://127.0.0.1:5173/departamentos>
- Calendario: <http://127.0.0.1:5173/calendario>
- Turnos y festivos: <http://127.0.0.1:5173/turnos>
- Ubicaciones: <http://127.0.0.1:5173/ubicaciones>
- Asistencia: <http://127.0.0.1:5173/asistencia>
- Incidencias: <http://127.0.0.1:5173/incidencias>
- Solicitudes: <http://127.0.0.1:5173/solicitudes>
- Aprobaciones: <http://127.0.0.1:5173/aprobaciones>
- Vacaciones: <http://127.0.0.1:5173/vacaciones>
- Políticas de ausencias: <http://127.0.0.1:5173/politicas-ausencias>
- Avisos: <http://127.0.0.1:5173/avisos>
- Auditoría (ADMIN): <http://127.0.0.1:5173/auditoria>
- Estado del sistema: <http://127.0.0.1:5173/estado>
- Las rutas web desconocidas muestran una página 404 con regreso al inicio.
- API: <http://127.0.0.1:3001/api/health/live>
- PostgreSQL disponible: <http://127.0.0.1:3001/api/health/ready>
- OpenAPI y Swagger UI: <http://127.0.0.1:3001/docs/> (desarrollo).

## Verificación

```bash
pnpm check
pnpm db:test:up
pnpm test:integration
pnpm exec playwright install chromium
pnpm test:e2e
pnpm audit --prod
```

Consulta [Desarrollo](docs/DEVELOPMENT.md), [guía de contribución](docs/AGENTS.md), [arquitectura](docs/architecture/TECHNICAL_BASE.md) y [decisión inicial](docs/adr/ADR-001-ARCHITECTURE.md).

La definición de Departamentos y sus restricciones están en [Modelo de datos](docs/architecture/DEPARTMENTS_DATA_MODEL.md); la decisión del router y el alcance están en [ADR-002](docs/adr/ADR-002-ROUTER-DEPARTMENTS.md).

## Departamentos

- `GET /api/departments`: consulta el listado.
- `POST /api/departments`: crea un departamento; devuelve 201 o 409 si el nombre ya existe.
- `PUT /api/departments/:id`: edita el nombre y conserva el identificador.
- `DELETE /api/departments/:id`: elimina si no tiene registros vinculados; devuelve 204 o 409.

Consultar [contratos, ejemplos y errores HTTP](docs/api/DEPARTMENTS.md) y [evidencia de la entrega](docs/verification/2026-11-12-departments-vertical-slice.md). La aplicación requiere sesión y aplica permisos por rol y departamento.

La integración actual está documentada en [ADR-003](docs/adr/ADR-003-DEPARTMENTS-API-WEB.md).

## Identidad y empleados

Crear el primer administrador con `pnpm admin:create` (contraseña oculta). Luego ingresar y gestionar Usuarios, Empleados y Responsables. Para recuperación del administrador: `pnpm admin:recovery`. No hay cuentas ni contraseñas predeterminadas.

Ver [permisos, recuperación y API](docs/api/IDENTITY_EMPLOYEES.md) y [evidencia de etapas 8–9](docs/verification/2026-11-12-identity-employees.md). `APP_ORIGIN` define el origen permitido; valor local inicial `http://127.0.0.1:5173`. En desarrollo también se admite `localhost` con el mismo protocolo y puerto; en pruebas y producción la coincidencia es exacta.

## Auditoría, horarios y ubicaciones

Las migraciones incorporan las cuatro plantillas iniciales y el centro confirmado, con radio **10 m** y precisión máxima inicial configurable **10 m**. No crean empleados ni cuentas de demostración. Las autorizaciones de centro se asignan explícitamente a cada empleado presencial.

Consultar [auditoría/avisos](docs/api/AUDIT_NOTIFICATIONS.md), [turnos/calendario](docs/api/PLANNING.md) y [ubicaciones](docs/api/LOCATIONS.md). Los avisos se entregan dentro del sistema; no hay SMTP configurado. La comprobación GPS independiente no registra entradas/salidas. El módulo de [Asistencia](docs/api/ATTENDANCE.md) registra intentos con hora del servidor y GPS presencial transaccional. Home office no solicita ni guarda comprobaciones GPS. Ver [evidencia de etapa 13](docs/verification/2026-11-13-attendance.md).

## Solicitudes y vacaciones

Configurar jefatura y, para solicitudes del propio jefe, superior explícito. La aprobación de jefatura es definitiva en solicitudes nuevas; ADMIN/HR no adquieren esa autoridad por su rol. RR. HH. configura la política de vacaciones y los tipos de permiso; luego concede períodos cumplidos con motivo. No se cargan políticas internas ni saldos históricos automáticamente.

Cada solicitud nueva reserva saldo cuando corresponde y aplica efectos con la aprobación definitiva de jefatura. Las solicitudes anteriores a la migración 0010 conservan su flujo histórico de jefe/director. Rechazo/retiro liberan reserva y cancelación futura aprobada devuelve consumo con movimiento separado. Evidencias PDF/PNG/JPEG privadas, hasta tres de 1 MiB. Ver [API y reglas](docs/api/REQUESTS.md) y [verificación de etapas 14–15](docs/verification/2026-11-13-approvals-leave.md).

## Dashboard y configuración administrativa

Al ingresar se abre el dashboard con información propia y, cuando corresponde, del equipo autorizado. Distingue marcajes aceptados, faltas evaluadas y pendientes de evaluación; muestra incidencias sin resolver, solicitudes, decisiones autorizadas, vacaciones por período y avisos sin leer.

`/configuracion` reúne las pantallas de ADMIN/HR y un diagnóstico con enlaces para revisar faltantes. No carga responsables, políticas ni saldos automáticamente. La política de asistencia tiene pantalla dedicada y conserva versiones/snapshots. Ver [contrato y definiciones](docs/api/DASHBOARD.md) y [evidencia de cierre](docs/verification/2026-11-17-dashboard-configuration.md).

La secuencia acordada es: completar el panel web, configurar la operación real, preparar producción y finalmente implementar la app móvil. La configuración operativa y la certificación de producción son pasos separados de esta entrega.

La aprobación laboral definitiva de jefatura está descrita en [API de solicitudes](docs/api/REQUESTS.md) y en la [verificación del cambio](docs/verification/2026-11-17-head-final-approval.md).

SUPER_ADMIN incorpora gestión técnica global y protege sus cuentas frente a administradores inferiores. Su rol no sustituye la autoridad laboral de jefatura. Ver [identidad y empleados](docs/api/IDENTITY_EMPLOYEES.md).

Preparación operativa: [producción y respaldos](docs/PRODUCTION.md). La política de vacaciones LFT está publicada en desarrollo; saldos y calendarios individuales requieren los datos reales de la empresa. `pnpm db:backup` permite crear y verificar copias locales con restauración aislada.

Permisos por horas: Entrada tardía y Salida anticipada requieren 24 horas de anticipación, intervalo de ausencia y motivo, sin comprobante obligatorio. Están configurados con goce de sueldo; se puede cambiar en `/politicas-ausencias` y las solicitudes anteriores conservan sus condiciones. Ver [configuración y verificación](docs/verification/2026-11-18-hourly-permissions.md).

Se entrega calendario oficial México 2026–2027 (LFT/INE); cargar después de migrar con `pnpm holidays:sync` y SUPER_ADMIN activo. Desde las 08:30 en jornada administrativa 08:00 se acepta el marcaje con falta justificable; corte configurable y controles históricos conservados. Ver [fuentes y verificación](docs/verification/2026-11-18-official-holidays-attendance.md).
