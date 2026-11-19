# Verificación: etapas 8 y 9

Fecha: 2026-11-12. Resultado: **identidad/acceso y empleados/responsables completos para uso local**.

## Entrega

- Login/logout, sesiones PostgreSQL, cookies protegidas, Argon2id, CSRF/Origin, límites de intentos y recuperación de acceso de un uso.
- Usuarios con roles múltiples ADMIN/HR/EMPLOYEE, activación/desactivación, revocación y protección del último ADMIN activo.
- Expedientes de empleados: número, nombre, departamento, puesto, ingreso civil, categoría, estado, superior y usuario opcionales; validación, unicidad, referencias y rechazo de ciclos.
- Jefaturas, director y suplencias formales con vigencia, fuente titular, motivos e historial. Lectura filtrada por expediente propio/departamentos gestionados/alcance global.
- Pantallas de ingreso, recuperación, cuenta, usuarios, empleados y responsables; Departamentos ahora protegido por sesión y permisos.
- CLI de primer administrador con contraseña oculta y CLI de recuperación administrativa; sin credenciales predeterminadas.

No se implementaron solicitudes/aprobaciones, auditoría general, notificaciones, horarios ni marcajes. La siguiente etapa es el punto 10.

## Verificaciones ejecutadas

| Comprobación                            | Resultado                                                     |
| --------------------------------------- | ------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`        | Correcto, lockfile reproducible                               |
| `pnpm lint`                             | Correcto; 139 módulos, 309 dependencias sin infracciones      |
| `pnpm format:check`                     | Correcto                                                      |
| `pnpm typecheck`                        | Correcto en API, web, contratos, herramientas y E2E           |
| `pnpm test`                             | 88 pruebas aprobadas, 14 archivos                             |
| `pnpm test:integration`                 | 58 pruebas aprobadas, 5 archivos, PostgreSQL real             |
| `pnpm test:e2e`                         | 12 pruebas aprobadas, escritorio y móvil                      |
| `pnpm build`                            | Contratos, API y web compilados                               |
| `pnpm audit --prod`                     | Cero vulnerabilidades reportadas                              |
| `pnpm db:migrate` repetido              | Correcto; 3 migraciones, sin modificar las anteriores         |
| Datos de desarrollo                     | Cero usuarios y cero empleados inventados                     |
| API compilada + PostgreSQL aislado      | CLI inicial, login, permisos, persistencia y logout correctos |
| Cookie con `NODE_ENV=production`        | HttpOnly, Secure, SameSite=Strict                             |
| API compilada anónima / docs producción | 401 / 404                                                     |
| Cierre SIGTERM del servidor compilado   | Código 0                                                      |
| Runtime local                           | Ingreso web 200; Usuarios sin sesión 401                      |

Total: **158 pruebas aprobadas**. El navegador usó cuentas reales efímeras creadas exclusivamente en `_test`. Las pruebas HTTP/CLI crearon bases temporales propias y las eliminaron; no tocaron cuentas de desarrollo. E2E limpió exclusivamente sus usuarios, expedientes y asignaciones.

## Cobertura relevante

Autenticación: hash Argon2id con salts distintas, contraseña completa, sesión almacenada como SHA-256, flags de cookie, CSRF y Origin, límites de intentos, expiración/revocación, recuperación de un solo uso y último ADMIN. La CLI inicial se ejecutó realmente: crea una sola cuenta, rechaza repetir y no imprime contraseña/hash; recuperación CLI genera código temporal.

Organización: permisos ADMIN/HR frente a EMPLOYEE, consulta propia/departamental/director, acceso ajeno 404, rechazo de autoescalada, fechas civiles inválidas, nombre/número inválidos, unicidad, ciclos, cambios de departamento, jefatura/director únicos, suplencias finitas, concurrencia, adyacencia de intervalos y conservación de historial.

UI: inicio/cierre de sesión, recuperación/cuenta, denegación de pantallas, formularios y borradores, cachés descartadas al cambiar cuenta/salir/recibir 401, validación Unicode/carácter nulo y actualización de permisos/listados. Se mantiene el estado público del sistema para usuarios anónimos.

E2E: acceso real y salida, recarga de sesión, bloqueo privado tras logout, crear empleado y jefatura desde React y comprobar SQL/recarga, impedir que EMPLOYEE se conceda roles, regresión de Departamentos y navegación. Sin mocks en los flujos E2E. Se inspeccionaron capturas de escritorio y móvil en `test-results/`.

## Revisión independiente y correcciones

Se corrigieron con RED→GREEN dos hallazgos:

1. Un empleado podía leer historial ajeno del departamento propio. El historial ahora se amplía solo por departamentos gestionados; un empleado ordinario recibe únicamente asignaciones propias.
2. Inactivar y desvincular en el mismo PUT podía mantener activa la cuenta anterior. Se procesan ambas asociaciones transaccionalmente, revocando la anterior; tampoco permite evadir la protección del último ADMIN.

Tres regresiones PostgreSQL fallaron antes y pasaron tras la corrección. Se añadió además una regresión de carácter nulo en formularios y comprobaciones de límites Unicode y fronteras de schema público/dominio.

## Límites operativos

La comprobación compilada ejecutó el servidor local con modo producción para verificar atributos de cookie, documentación y permisos; no certifica TLS ni despliegue externo. Producción necesita HTTPS, origen/secretos propios y controles operativos de su etapa. El rate limit es del proceso y reinicia con él.

La recuperación no simula envío de correo: ADMIN entrega el código, o el operador usa `pnpm admin:recovery`. Las asignaciones tienen historial específico, pero la auditoría general y las notificaciones pertenecen al punto 10.

El acceso personal se configura con `pnpm admin:create`; el operador elige la contraseña en entrada oculta. No se crearon cuentas predeterminadas. Sin staging, commits, push ni publicación.
