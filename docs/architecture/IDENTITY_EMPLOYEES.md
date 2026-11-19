# Etapas 8 y 9: identidad, empleados y responsables

## Alcance autorizado

Usuarios, login/logout, sesiones persistentes, roles y autorización por departamento; expediente de empleados, jefaturas, director y suplencias formales con historial. Incluye API, interfaz y verificación PostgreSQL/navegador. No implementar solicitudes/aprobaciones, vacaciones, marcajes ni notificaciones de la etapa 10.

## Identidad y permisos

Roles múltiples por usuario: `ADMIN`, `HR`, `EMPLOYEE`. ADMIN administra usuarios y organización; HR administra expedientes/organización, pero no concede roles. Las responsabilidades organizacionales no son roles globales: un jefe/suplente ve el departamento asignado durante su vigencia; el director vigente consulta toda la organización; un empleado consulta su expediente. ADMIN/HR ven todos. El rol por sí solo no concede una jefatura ni autoridad para saltar futuras aprobaciones.

Las sesiones usan token aleatorio de 256 bits en cookie HttpOnly, SameSite=Strict, Secure en producción, sin Domain. PostgreSQL guarda solo su SHA-256; expiración absoluta de 8 horas. Las mutaciones requieren token CSRF asociado a la sesión y validación de Origin; login/recuperación exigen JSON y rechazan Origin distinto al configurado. No usar JWT/localStorage. Argon2id: 19 MiB, 2 iteraciones, paralelismo 1. Contraseña de 6–128 puntos de código, sin truncar ni recortar. Rate limit en login/recuperación; sin Redis.

Login inválido responde igual para usuario desconocido/inactivo/contraseña incorrecta. Logout, desactivación, cambio/recuperación de contraseña revocan sesiones. Cambiar roles revoca las sesiones del afectado. Proteger el último ADMIN activo con bloqueo transaccional, también si se inactiva su expediente vinculado.

Crear el primer administrador mediante CLI con contraseña oculta; no generar credenciales predeterminadas. Recuperación mediante código temporal de un solo uso entregado por ADMIN desde Usuarios: no afirmar envío de correo sin infraestructura. El token se muestra una sola vez, se guarda hasheado y vence a los 30 minutos.

## Empleados

UUID, número interno único (1–30), nombre completo (1–150), departamento, puesto (1–120), fecha civil de ingreso, categoría ADMINISTRATIVE/OPERATIONAL, estado ACTIVE/INACTIVE, superior opcional y usuario vinculado opcional único. Validar NFC/trim, fechas reales, referencias, no autorreferencia/ciclos y campos adicionales. No agregar datos sensibles innecesarios.

Crear/editar requiere ADMIN/HR. Lecturas se filtran en SQL por actor; detalle ajeno responde 404. Vincular solo usuario existente/activo. Inactivar empleado revoca/desactiva su cuenta vinculada usando contrato público de identidad en la misma transacción; reactivar expediente no reactiva automáticamente su cuenta. Bloquear cambios que dejarían cero administradores activos.

## Responsables y suplencias

Asignaciones históricas HEAD, DIRECTOR y SUBSTITUTE. HEAD pertenece al departamento; un único titular vigente por departamento y un único director vigente. Sustituir titular/director cierra la asignación anterior sin borrarla.

Suplencia: empleado activo distinto al titular, departamento explícito, referencia a jefatura titular, inicio/fin UTC y motivo obligatorio. Intervalos [inicio, fin), fin posterior al inicio. Puede cubrir otro departamento mediante autorización explícita de ADMIN/HR. Su alcance solo vale si la jefatura original sigue vigente y activa. No permitir suplencias superpuestas del mismo empleado/departamento. Permitir revocación conservando historial. Inactivar/mover al titular cierra asignaciones incompatibles; no inventar sucesor ni jerarquía.

## Composición modular

Identidad y empleados publican `index.ts` para servicios/puertos y `schema.ts` exclusivamente para FK/registro de persistencia. Otros módulos no acceden a sus repositorios privados. La composición inyecta a los guards de identidad un resolver de alcance de empleados para evitar dependencia circular. Ningún dominio importa Fastify/Drizzle.

## Interfaz y pruebas

Pantallas Ingresar, Recuperar acceso, Mi cuenta, Usuarios (ADMIN), Empleados y Responsables. Ocultar acciones no autorizadas, preservar borradores/errores y vaciar caché al salir/cambiar de sesión. API es autoridad final. Mantener Departamentos, ahora autenticado y con creación ADMIN/HR.

Probar Argon2/sesiones/cookie/CSRF/Origin/rate limit, recuperación de un uso, expiración/revocación, último ADMIN, alcance departamento/propio, historial, suplencias/fechas/ciclos, concurrencia y regresión. PostgreSQL real aislado `_test`; E2E usa usuarios efímeros y limpieza propia. No crear cuentas de desarrollo con contraseñas inventadas.

Fuentes: [OWASP contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
