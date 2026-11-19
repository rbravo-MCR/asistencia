# Desarrollo local

Regla vigente desde el 17 de noviembre de 2026: aprobación laboral definitiva de jefatura para solicitudes nuevas (`HEAD_ONLY`). Aplicar la migración 0010; los registros anteriores conservan `HEAD_DIRECTOR`. Ver `docs/api/REQUESTS.md`.

## Herramientas y configuración

Usar Node 26.13.1 (`nvm install && nvm use`) y pnpm 12.18.0 (`npm install --global pnpm@12.18.0`). No es necesario cambiar la versión predeterminada de Node de otros proyectos.

Ejecutar desde la raíz:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm dev
```

Copiar `.env.example` únicamente si no existe `.env`. Las credenciales del ejemplo son exclusivas de desarrollo y no deben reutilizarse en producción. `.env` está ignorado por Git.

La API valida `DATABASE_URL`, `HOST`, `PORT`, `NODE_ENV`, `LOG_LEVEL` y `APP_TIME_ZONE`. Los nombres de campos inválidos se muestran sin sus valores. `APP_TIME_ZONE` usa una zona IANA; no impone reglas de jornada.

La web escucha en `127.0.0.1:5173`; la API, en `127.0.0.1:3001`. Vite envía `/api` a `API_PROXY_TARGET` mediante un proxy del mismo origen. Si cambia `PORT`, actualizar también esa variable. Los scripts arrancan desde el monorepo y cargan `.env` de la raíz.

## PostgreSQL y migraciones

`infra/compose.yaml` utiliza el proyecto Docker `asistencia`. El servicio de desarrollo publica `127.0.0.1:55432`; el de pruebas publica `127.0.0.1:55433`. No reutiliza bases ni contenedores de otros proyectos.

- `pnpm db:up`: inicia PostgreSQL de desarrollo y espera su healthcheck.
- `pnpm db:migrate`: aplica las migraciones pendientes, sin modificar las ya aplicadas.
- `pnpm db:generate`: genera SQL y snapshot desde el esquema Drizzle; revisar ambos antes de aplicarlos.
- `pnpm db:test:up`: inicia PostgreSQL de pruebas con almacenamiento efímero.
- `pnpm db:down`: detiene los servicios del proyecto; conserva el volumen de desarrollo. La base de pruebas se pierde al detener su contenedor.

La primera migración crea el esquema técnico `app_meta`; `0001_departments.sql` crea `departments` y `0002_identity_employees.sql` agrega identidad, empleados y asignaciones. No hay usuarios ni datos semilla. El historial de migraciones lo mantiene Drizzle en `drizzle.__drizzle_migrations`. No se ejecutan migraciones automáticamente al arrancar la API.

## Comandos de calidad

| Comando                             | Verificación                                                        |
| ----------------------------------- | ------------------------------------------------------------------- |
| `pnpm lint`                         | ESLint y restricciones del grafo de dependencias                    |
| `pnpm format:check` / `pnpm format` | Revisar / aplicar Prettier                                          |
| `pnpm typecheck`                    | TypeScript estricto en aplicaciones, contratos y herramientas       |
| `pnpm test`                         | Configuración, HTTP, UI y límites entre módulos                     |
| `pnpm test:integration`             | Migraciones repetidas, transacciones y readiness en PostgreSQL real |
| `pnpm test:e2e`                     | Chromium: escritorio y móvil contra API y PostgreSQL reales         |
| `pnpm build`                        | Compilar contratos, API y web en orden                              |
| `pnpm check`                        | Lint, formato, tipos, pruebas unitarias/UI y build                  |
| `pnpm audit --prod`                 | Auditoría de dependencias de producción                             |

Las pruebas de integración requieren `pnpm db:test:up`. Cargan `TEST_DATABASE_URL` y rechazan una base cuyo nombre no termine en `_test`; nunca usan `DATABASE_URL` como fallback. Aplican migraciones exclusivamente a esa base. No requieren SQLite.

Para navegador, instalar antes `pnpm exec playwright install chromium`; en un host Linux limpio puede ser necesario `pnpm exec playwright install --with-deps chromium`. Playwright inicia y cierra sus propios servidores en 3101/5183. Comprueba también navegación, acceso directo, recarga y recuperación de rutas 404. Genera capturas en `test-results/` y conserva trazas si falla. Usar un `.env` de desarrollo; no suministrar credenciales reales a estos tests.

## API y compilación

- `/api/health/live`: confirma que el proceso responde, sin consultar PostgreSQL.
- `/api/health/ready`: consulta PostgreSQL; devuelve 200 o 503 y no expone detalles de conexión.
- `/docs/` y `/docs/json`: documentación de desarrollo; no se registran con `NODE_ENV=production`.

```bash
pnpm build
pnpm --filter @asistencia/api start
# En otra terminal:
pnpm --filter @asistencia/web preview
```

`preview` sirve la compilación de la web en 4173, pero no es un servidor de producción ni incluye el proxy de la API. Para desplegar, configurar un reverse proxy de `/api` del mismo origen y servir `apps/web/dist`, con fallback a `index.html` para rutas SPA como `/estado`. El fallback no debe interceptar `/api`. La API compilada necesita `packages/contracts/dist` y los archivos `apps/api/drizzle` si se ejecutan migraciones. SIGINT/SIGTERM cierran el servidor y su pool de conexiones.

## Alcance pendiente

Se completó la primera entrega funcional (puntos 1–7): router, dominio/contratos, persistencia, API y pantalla de creación/listado de Departamentos. Hay rutas `/`, `/departamentos` y `/estado`, layout común y página 404. Las etapas 8 y 9 incorporan identidad y autorización, creación/edición de usuarios y empleados, y responsabilidades con historial. Las etapas 10–12 incorporan auditoría/avisos internos, planificación de turnos y ubicaciones. La etapa 13 incorpora marcajes propios, historial e incidencias con motivos. Las etapas 14–15 incorporan solicitudes, decisiones de jefe/director, saldo de vacaciones, permisos y justificaciones. La aplicación móvil (16) se pospone al final; la etapa 17 incorpora dashboard y configuración central. Departamentos y empleados permiten CRUD con permisos ADMIN/HR. No se eliminan departamentos con empleados/responsabilidades ni empleados con responsabilidades/subordinados; se conserva el historial. No hay eliminación física de usuarios por API. Los horarios y centros ya son configurables; se valida GPS bajo demanda. Las solicitudes nuevas tienen aprobación definitiva de jefatura; las históricas conservan sus pasos jefe/director. ADMIN/HR no obtienen autoridad de decisión automáticamente.

Consultar el [modelo de Departamentos](architecture/DEPARTMENTS_DATA_MODEL.md) para campos y restricciones. Las pruebas de migración desde base vacía necesitan `CREATEDB` en el servidor de pruebas; el servicio Docker dedicado ya lo permite.

## Probar la funcionalidad de Departamentos

Abrir `http://127.0.0.1:5173/departamentos`, escribir un nombre y pulsar **Crear departamento**. La confirmación aparece tras el POST y el listado se vuelve a consultar. Recargar comprueba persistencia. Un nombre equivalente por mayúsculas produce conflicto y conserva el texto para corregirlo.

Las filas ofrecen **Editar** y **Eliminar** para ADMIN/HR. La eliminación pide confirmación y muestra un bloqueo si hay registros vinculados. La pantalla tiene estados de carga, vacío, error recuperable, guardando y éxito. La fecha de creación se muestra en `America/Merida`; la API entrega UTC. Los endpoints y ejemplos están en [API de Departamentos](api/DEPARTMENTS.md).

`pnpm test:e2e` crea desde React, consulta PostgreSQL directamente, recarga y prueba duplicado en escritorio/móvil. Limpia solo los IDs creados por la prueba en `_test`. La integración HTTP utiliza además una base temporal propia, sin datos de desarrollo. No es necesario modificar migraciones ni cargar datos semilla.

## Identidad y responsables

Después de migrar: `pnpm admin:create`; elige correo, nombre y contraseña de 6–128 caracteres en entrada oculta. Ingresar en `/ingresar` con el identificador `999999` o el correo registrado. El bootstrap rechaza crear otro administrador si ya existe ADMIN o SUPER_ADMIN; usar Usuarios para las siguientes cuentas. Para recuperar el administrador sin otra sesión disponible: `pnpm admin:recovery`, copiar el código temporal únicamente a `/recuperar`.

`APP_ORIGIN` define el origen permitido, sin path ni slash final. Solo en desarrollo se admiten `localhost` y `127.0.0.1` como alternativas con el mismo protocolo y puerto. En pruebas y producción debe coincidir exactamente con el origen del navegador. `SESSION_HOURS` admite 1–24, predeterminado 8. En producción la cookie usa Secure y se necesita HTTPS. No escribir claves reales en scripts, Git ni variables de ejemplo.

Las pruebas ahora usan sesiones reales y CSRF: se crean usuarios temporales solo en `_test`; los tests de CLI y HTTP crean su propia base temporal. Las páginas de Departamentos quedan protegidas; sus consultas necesitan sesión y las escrituras POST/PUT/DELETE necesitan CSRF y ADMIN/HR.

Ver [guía de identidad y empleados](api/IDENTITY_EMPLOYEES.md). Los avisos internos persistentes están implementados; no hay correo/SMTP simulado. La recuperación conserva códigos entregados por un administrador. Para automatización aislada, las CLI aceptan BOOTSTRAP_ADMIN_EMAIL/NAME/PASSWORD y ADMIN_RECOVERY_EMAIL desde el entorno del proceso; se recomienda la entrada interactiva para acceso humano y no persistir esas claves en `.env`.

## Etapas 10–12

Después de actualizar, ejecutar `pnpm db:migrate`. La migración 0005 crea auditoría/outbox, planificación y ubicaciones; la 0006 inserta una sola vez las cuatro plantillas confirmadas y el centro real. Reiniciar o repetir migraciones no restablece cambios administrativos ni recrea valores eliminados.

Rutas nuevas: `/auditoria` (ADMIN), `/avisos` (bandeja propia), `/turnos` (ADMIN/HR), `/calendario` (alcance autorizado), `/ubicaciones` (consulta propia y gestión ADMIN/HR). Asignar centro y vigencia antes de publicar un turno presencial. Operativos usan home office sin GPS obligatorio. Radio inicial confirmado: 10 m; precisión máxima inicial: 10 m, ambos editables.

`NOTIFICATION_WORKER_ENABLED` acepta true/false. Por defecto activo en desarrollo/producción, desactivado en pruebas; Playwright lo activa para comprobar la entrega real. Las escrituras y outbox son atómicas, los pendientes sobreviven a reinicios y la entrega a bandeja es idempotente. No se envían correos ni SMS.

Ejecutar `pnpm check` y `pnpm test:integration` antes de `pnpm test:e2e`; no recompilar contratos ni editar fuentes durante Playwright para evitar recargas de Vite. Los ensayos GPS usan permisos/coordenadas del navegador de pruebas, nunca la ubicación personal del operador.

## Etapa 13: Asistencia

Ejecutar `pnpm db:migrate`: la migración 0007 crea las tablas y habilita la política inicial una sola vez, con hora del servidor. No se generan faltas automáticas para turnos anteriores a la habilitación si no tenían control iniciado. Reiniciar o repetir migraciones conserva políticas e historial.

Rutas `/asistencia` y `/incidencias`: marcajes del empleado activo vinculado, turno publicado explícito, historial e incidencias según alcance. ADMIN/HR configuran versiones de política y evalúan períodos; no pueden marcar por otra persona. Capturar motivo desbloquea el siguiente marcaje, pero no aprueba la incidencia.

Tolerancia inicial 10 min (retardo desde minuto completo 11). Entrada desde 30 min antes del inicio hasta el fin; salida desde el inicio hasta 120 min después del fin. Los valores 30/120 son iniciales propuestos y configurables, pendientes de validación operativa. Cada control conserva su versión de política.

`ATTENDANCE_WORKER_ENABLED` acepta true/false; activo por defecto en desarrollo/producción y desactivado en pruebas. `ATTENDANCE_EVALUATION_INTERVAL_SECONDS` vale 60 por defecto (1–3600). Evalúa turnos vencidos con hora del servidor en lotes de hasta 100 y recupera pendientes tras reinicio. El worker de notificaciones entrega los avisos internos. Desactivar la evaluación automática conserva la manual ADMIN/HR con CSRF.

Presencial exige GPS al entrar y salir, validado contra el centro del turno y autorización vigente; cada intento conserva su resultado. Home office ignora coordenadas recibidas y no crea comprobaciones GPS. Pruebas de integración y E2E usan PostgreSQL `_test`, sesiones reales y coordenadas de prueba. Ver [contrato API](api/ATTENDANCE.md) y [cierre local](verification/2026-11-13-attendance.md). Biometría nativa, aplicación móvil y sincronización offline corresponden a la etapa 16.

## Etapas 14–15: solicitudes y ausencias

Aplicar `pnpm db:migrate`. Las migraciones 0008/0009 incorporan políticas, solicitudes, decisiones, evidencias privadas, libro de movimientos e idempotencia; no crean política empresarial, usuarios, solicitudes ni saldos iniciales.

ADMIN/HR configura `/politicas-ausencias`: tabla de días por antigüedad, calendario por categoría, exclusión de festivos manuales y tipos de permiso. En `/vacaciones`, concede períodos por aniversario o registra ajustes con motivo. No hay caducidad ni concesión automática; validar las reglas internas antes de usar saldos operativos.

Configurar jefaturas/suplencias vigentes en `/responsables`; los empleados deben tener cuenta activa. La dirección adicional ya no es un requisito para nuevas solicitudes. Para solicitudes propias del jefe, configurar su superior explícito distinto del solicitante. Si no existe cadena válida, el envío falla con mensaje de configuración. ADMIN/HR no saltan la cadena.

`/solicitudes` permite vacaciones, permisos, justificaciones de incidencias propias y cancelaciones futuras; `/aprobaciones` ofrece acciones solo según autorización calculada por servidor. El historial mantiene ambas decisiones, motivos, actor/fecha, evidencias y retiro. La aprobación definitiva de jefatura genera efectos de saldo/resolución una sola vez; los avisos son internos y usan el outbox existente.

Los adjuntos se incluyen en JSON al enviar y se conservan en PostgreSQL bytea. Máximo tres archivos de 1 MiB, firmas PDF/PNG/JPEG y descarga autenticada attachment. `/api/requests` tiene límite JSON 5 MiB; las demás rutas conservan 1 MiB. No se escribe almacenamiento público ni se necesita servicio externo.

La asistencia reconoce cobertura completa aprobada; las justificaciones/ausencias aprobadas después de una falta resuelven por referencia sin alterar evaluación o marcaje original. Publicar turnos completamente cubiertos por una ausencia aprobada devuelve conflicto. Permisos parciales no eximen toda la jornada.

Ver [API](api/REQUESTS.md) y [evidencia](verification/2026-11-13-approvals-leave.md). Para E2E con este entorno, después de compilar contratos se puede ejecutar `node node_modules/@playwright/test/cli.js test`, que evita el problema observado de señal 143 del lanzador pnpm al cerrar servidores. No recompilar contratos ni editar fuentes durante Playwright.

## Dashboard y configuración administrativa (etapa 17)

No requiere migraciones nuevas. El inicio autenticado consulta `/api/dashboard` y el público conserva la bienvenida/estado de servicios. El ingreso exitoso lleva al dashboard; Mi cuenta sigue disponible en navegación.

ADMIN/HR acceden a `/configuracion` y `/configuracion/asistencia`. Los diagnósticos son lecturas sin cambios; completar la configuración empresarial requiere decisiones y datos operativos del punto 2. No modificar `.env`, cuentas, políticas o saldos de desarrollo para simular que está completo.

Contratos/definiciones: [Dashboard](api/DASHBOARD.md). Las pruebas agregadas incluyen base PostgreSQL temporal propia, HTTP autenticado, alcance, turno nocturno, avisos >100, motivo sin resolución y navegación en escritorio/móvil. Las escrituras E2E de política conservan los mismos umbrales para no cambiar las reglas de suites paralelas; la integración aislada verifica valores distintos y snapshots conservados.

Playwright inicia Vite directamente mediante Node en `apps/web`, evitando el fallo de señal 143 observado al cerrar el lanzador pnpm. La repetición completa de esta entrega terminó con 30 pruebas aprobadas y código 0. Ver [evidencia](verification/2026-11-17-dashboard-configuration.md).

### Superadministración técnica

La migración 0011 incorpora `SUPER_ADMIN`, con todo el alcance técnico de ADMIN y protección frente a administradores inferiores. El rol se muestra como **Super administrador** en Mi cuenta y Usuarios. Solo un SUPER_ADMIN activo puede gestionar cuentas con ese rol, sus expedientes vinculados y sus responsabilidades. El último SUPER_ADMIN activo no puede desactivarse ni perder el rol. Cambiar la pertenencia al rol revoca sesiones y códigos de recuperación anteriores. El CLI local `admin:recovery` admite también SUPER_ADMIN; requiere acceso al servidor.

La primera promoción es mantenimiento local explícitamente autorizado y auditado, sin cambiar credenciales ni conceder permisos laborales de aprobación. Las altas posteriores se realizan desde Usuarios por un superadministrador. Aplicar `pnpm db:migrate` antes de utilizar el nuevo código.

### Respaldo local y configuración de salida

`pnpm db:backup create DIRECTORIO_PRIVADO` crea un dump PostgreSQL custom y manifiesto SHA-256 con permisos privados. `pnpm db:backup verify ARCHIVO.dump` restaura únicamente en una base temporal generada en postgres-test, compara los recuentos del snapshot y elimina la copia incluso con conexiones residuales. No restaura sobre la base real. Los comandos usan los clientes PostgreSQL de Compose y conexiones locales de `.env`.

La política LFT confirmada se publicó en desarrollo sin conceder períodos ni reconstruir saldos históricos. El preset se documenta en `config/policies/lft-leave-policy.json`, con escala separada. Revisar descansos individuales antes de incorporar personal operativo. Permisos por horas ya configurados. Festivos oficiales México 2026–2027 se cargan con `pnpm holidays:sync` (SUPER_ADMIN activo). La política de asistencia v2 tiene corte administrativo de 30 minutos: acepta entrada desde 08:30 para jornada 08:00, con falta justificable y eventos conservados. Siguen pendientes vigencias de jornadas/centros y saldos históricos. Ver [cierre y fuentes](verification/2026-11-18-official-holidays-attendance.md).

La configuración production ahora requiere APP_ORIGIN HTTPS. Ver [operación y producción](PRODUCTION.md) para arranque con archivo externo, límites del correo y respaldo externo pendiente. Los avisos actuales continúan siendo internos.
