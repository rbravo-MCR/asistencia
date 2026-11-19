# Identidad, empleados y responsables

Etapas 8 y 9. Toda la funcionalidad usa PostgreSQL; no hay usuarios ni contraseñas predeterminados.

El generador de números y el acceso numérico del administrador se describen en [Números de empleado](EMPLOYEE_NUMBERS.md).

## Primer acceso

Con la base local iniciada y migrada:

```bash
nvm use
pnpm admin:create
```

El comando pide correo, nombre y contraseña con entrada oculta. Solo crea el primer administrador; si ya existe uno, rechaza crear otro mediante bootstrap. Las siguientes cuentas se gestionan en **Usuarios**.

Abrir `http://127.0.0.1:5173/ingresar`. `APP_ORIGIN` predeterminado es `http://127.0.0.1:5173`. Solo en desarrollo también se permite `http://localhost:5173`: ambos nombres deben conservar protocolo y puerto. En pruebas y producción el origen debe coincidir exactamente. Si falla la validación de origen, la pantalla pide actualizar la página y usar la dirección del sistema.

Si el administrador inicial pierde la contraseña:

```bash
pnpm admin:recovery
```

Pide el correo de un ADMIN o SUPER_ADMIN activo y muestra un código de un solo uso, válido 30 minutos. Introducirlo en `/recuperar` junto con una contraseña nueva. El código es sensible: no guardarlo en logs, Git ni chats. El comando requiere acceso local a las credenciales de base de datos. No reactiva cuentas inactivas ni crea cuentas nuevas.

Un administrador autenticado también puede generar un código para un usuario activo desde **Usuarios** y entregarlo por un medio seguro. No se envían correos automáticamente; las notificaciones son una etapa posterior.

## Sesiones y validación

- Argon2id, salt aleatoria, 19 MiB, dos iteraciones y paralelismo 1. Contraseñas de 6–128 puntos de código, sin recortar ni truncar.
- Cookie `asistencia_session`: HttpOnly, SameSite=Strict, path `/`, Secure en producción, sin Domain. Token aleatorio de 256 bits; solo su SHA-256 se guarda en PostgreSQL.
- Expiración absoluta `SESSION_HOURS` (8 por defecto, 1–24). No JWT ni tokens en localStorage.
- Los writes autenticados requieren `x-csrf-token`, obtenido de la sesión. Origin ajeno/cross-site se rechaza. Login y recuperación públicos solo aceptan su contrato JSON y comprueban Origin.
- Login tiene cinco intentos/minuto por correo e IP; recuperación/cambio de contraseña también tienen límite. Son límites del proceso, sin Redis; se reinician al reiniciar el servidor.
- Logout revoca la sesión; contraseña, recuperación, cambios de cuenta/roles o desactivación revocan las sesiones afectadas. Un usuario desactivado no inicia sesión.
- Las respuestas nunca incluyen hash de contraseña ni de sesión. Un fallo de login no distingue cuenta desconocida, inactiva o contraseña incorrecta.

## Permisos

| Actor                 | Lectura                                                  | Escritura                                     |
| --------------------- | -------------------------------------------------------- | --------------------------------------------- |
| SUPER_ADMIN           | Organización completa y usuarios                         | Gestión técnica total y cuentas protegidas    |
| ADMIN                 | Organización completa y usuarios                         | Usuarios, expedientes y responsables          |
| HR                    | Organización completa y directorio para vincular cuentas | Expedientes y responsables; no concede roles  |
| Director vigente      | Organización completa                                    | Sin facultad automática de editar expedientes |
| Jefe/suplente vigente | Su expediente y empleados de departamentos autorizados   | Sin facultad automática de editar expedientes |
| EMPLOYEE              | Su propio expediente y sus propias asignaciones          | Sin administración                            |

Los roles globales son SUPER_ADMIN, ADMIN, HR y EMPLOYEE y pueden combinarse. SUPER_ADMIN incluye el acceso técnico global de ADMIN. Solo otro SUPER_ADMIN activo puede crear, modificar, retirar el rol, desactivar o generar recuperación para una cuenta SUPER_ADMIN; la misma protección se aplica a su expediente vinculado y responsabilidades. No se puede retirar ni desactivar al último SUPER_ADMIN activo, aunque existan cuentas ADMIN. El cambio de pertenencia a SUPER_ADMIN revoca sesiones y códigos de recuperación pendientes. Director, jefatura y suplencia se derivan de asignaciones vigentes, no de un rol global ambiguo. Un EMPLOYEE designado formalmente como jefe adquiere solo el alcance departamental correspondiente. Las solicitudes nuevas usan HEAD_ONLY: la aprobación de la jefatura es definitiva. Las históricas conservan el flujo congelado HEAD_DIRECTOR. El rol técnico SUPER_ADMIN no concede autoridad laboral de aprobación por sí solo.

Las listas se filtran en SQL. Un expediente ajeno responde 404; una operación de administración no autorizada responde 403. Departamentos ahora requiere sesión: ADMIN/HR crean, editan y eliminan departamentos sin vínculos; el resto consulta únicamente departamentos de su alcance, salvo director vigente con lectura global.

## Endpoints

Todos llevan prefijo `/api`. Errores comunes conservan `{ error: { code, message, requestId } }`. Fechas de instantes son ISO UTC; `joinedOn` es fecha civil `YYYY-MM-DD`.

| Método y ruta                | Resultado / acceso                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| GET `/auth/session`          | Sesión pública con usuario, permisos, alcance, CSRF y expiración; 401 sin sesión         |
| POST `/auth/login`           | `{identifier,password}` (o correo compatible) → 200 sesión y cookie                      |
| POST `/auth/logout`          | Sesión + CSRF → 204                                                                      |
| POST `/auth/change-password` | `{currentPassword,password}` + CSRF → 204, ingresar de nuevo                             |
| POST `/auth/recover`         | `{token,password}` → 204, consume código y revoca sesiones                               |
| GET `/users`                 | ADMIN, listado sin hashes                                                                |
| POST `/users`                | ADMIN + CSRF; correo, nombre, contraseña, roles y active → 201                           |
| PUT `/users/:id`             | ADMIN + CSRF; correo, nombre, roles y active → 200                                       |
| POST `/users/:id/recovery`   | ADMIN + CSRF → código y vencimiento, se muestra una vez                                  |
| GET `/users/directory`       | ADMIN/HR; identificadores, nombre, correo y estado para vinculación                      |
| GET `/employees`             | Listado según alcance                                                                    |
| GET `/employees/:id`         | Expediente autorizado o 404                                                              |
| POST `/employees`            | ADMIN/HR + CSRF → 201                                                                    |
| PUT `/employees/:id`         | ADMIN/HR + CSRF → 200                                                                    |
| DELETE `/employees/:id`      | ADMIN/HR + CSRF → 204; sin responsabilidades ni subordinados, desactiva cuenta vinculada |
| GET `/assignments`           | Historial propio, departamentos gestionados o alcance global                             |
| POST `/assignments`          | ADMIN/HR + CSRF → 201                                                                    |
| DELETE `/assignments/:id`    | ADMIN/HR + CSRF → 204, revoca sin borrar historial                                       |

En las tablas siguientes, SUPER_ADMIN tiene también todos los permisos indicados como ADMIN; las cuentas protegidas requieren SUPER_ADMIN. La recuperación local requiere acceso al servidor y no expone una suplantación de actor por HTTP.

Códigos: 400 entrada inválida; 401 credenciales/sesión; 403 permisos/CSRF/Origin; 404 recurso fuera de alcance o inexistente; 409 duplicado/ciclo/último ADMIN/solapamiento; 429 demasiados intentos; 500 error interno sanitizado.

## Expedientes

Entrada de empleado: `employeeNumber`, `fullName`, `phoneNumber` y `address` opcionales/nullable, `departmentId`, `position`, `joinedOn`, `category` (ADMINISTRATIVE/OPERATIONAL), `status` (ACTIVE/INACTIVE), `supervisorId` nullable y `userId` nullable. UUID y timestamps son del servidor.

El número interno es único sin distinguir mayúsculas; se preservan ceros iniciales. Usuario vinculado único, referencias válidas, superior activo y sin ciclos. El celular admite 7–15 dígitos, con + inicial opcional; se eliminan separadores de presentación. La dirección admite hasta 500 puntos de código Unicode, normalizada a NFC y sin espacios externos. No se cargan documentos ni biometría. Los datos de contacto respetan el alcance autorizado del expediente.

Inactivar un expediente desactiva también su cuenta previamente vinculada, incluso si el mismo PUT la desvincula. Las cuentas previa/nueva se procesan transaccionalmente; no se puede retirar al último ADMIN activo. Reactivar el expediente no reactiva automáticamente la cuenta: ADMIN decide esa operación en Usuarios.

Eliminar un expediente requiere confirmación en la web. `DELETE /api/employees/:id` devuelve 204 sin cuerpo si no tiene responsabilidades, turnos, autorizaciones, comprobaciones GPS ni subordinados; cualquier referencia conserva el expediente y responde 409 `EMPLOYEE_IN_USE`, incluso con responsabilidades revocadas. Para conservar historial se usa la inactivación. Si tiene usuario vinculado, su cuenta y sesiones se desactivan/revocan en la misma transacción. Si la eliminación falla, esos cambios también se revierten. La protección del último ADMIN sigue vigente; la cuenta no se borra físicamente.

Si se omiten `phoneNumber`/`address` al crear, quedan en null. En PUT, omitirlos conserva el valor existente; enviar null o texto vacío lo borra. La web ofrece ambos campos opcionales en alta/edición y los muestra en el expediente.

## Responsables

- HEAD: empleado activo del mismo departamento. Asignación inmediata; cierra al titular anterior y revoca sus suplencias dependientes.
- DIRECTOR: empleado activo, `departmentId: null`, efecto inmediato; cierra al director anterior.
- SUBSTITUTE: empleado activo distinto al titular, departamento explícito, `startsAt`, `endsAt` y motivo; fuente de jefatura elegida por el servidor. Intervalo `[inicio, fin)`, sin solapamiento del mismo suplente/departamento. Puede cubrir otro departamento por autorización explícita.

Motivo obligatorio de hasta 250 puntos de código. HEAD/DIRECTOR no reciben fechas manuales; los timestamps los determina el servidor. Las suplencias necesitan fin posterior al inicio. Revocar, reemplazar o inactivar/mover al titular retira el alcance; no se inventa sucesor. Se conserva la asignación original, creador, motivo, inicio, fin y revocación. La auditoría general de modificaciones corresponde a la etapa 10.

## Pantallas

`/ingresar`, `/recuperar`, `/cuenta`, `/usuarios`, `/empleados`, `/responsables` y `/departamentos`. Usuarios solo ADMIN; los demás ven acciones según permisos. Cerrar sesión o recibir 401 descarta cachés privados. Fechas de expediente son civiles; el historial de responsabilidades muestra instantes UTC de forma explícita.

## Verificación

`pnpm check`, `pnpm test:integration` y `pnpm test:e2e`. Las suites crean usuarios reales temporales exclusivamente en `_test`; nunca cuentas de desarrollo con contraseñas inventadas. Los E2E verifican login/logout, expedientes/jefatura persistidos, recarga y bloqueo de autoescalada en escritorio/móvil.
