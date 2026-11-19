# ADR-004: Identidad y alcance organizacional

Fecha: 2026-11-12. Estado: implementado para desarrollo local.

## Decisión

Sesiones opacas persistentes en PostgreSQL, cookie HttpOnly/SameSite=Strict/Secure en producción, SHA-256 del token en la base y CSRF HMAC ligado a la sesión. No se incorporan JWT, localStorage, Redis ni proveedor externo de identidad. Para una empresa de 30 empleados esta solución mantiene revocación explícita y operación sencilla.

Argon2id con 19 MiB/t=2/p=1. Se verificaron e instalaron versiones estables exactas: `@node-rs/argon2` 2.2.2, `@fastify/cookie` 11.1.5 y `@fastify/rate-limit` 11.2.2; compatibilidad Fastify 5 comprobada mediante pruebas reales. Se conservan las dependencias y decisiones de etapas previas.

Roles múltiples ADMIN, HR y EMPLOYEE. Jefatura, dirección y suplencia son responsabilidades históricas de empleados; su vigencia determina alcance y no se representa como privilegio global. El bootstrap inyecta el resolver de alcance al control de acceso para evitar dependencia circular identidad/empleados.

Cada módulo publica servicios en `index.ts` y un contrato de persistencia `schema.ts` para FK y composición. El dominio sigue sin importar Fastify/Drizzle; otros módulos no acceden a repositorios privados. Las restricciones del grafo se actualizan para permitir únicamente esos dos contratos públicos.

## Consistencia

Bloqueos transaccionales PostgreSQL serializan gestión de cuentas y organización. Se protege el último ADMIN activo frente a cambios de roles, desactivación o inactivación/desvinculación de su expediente. Cambiar credenciales o roles revoca sesiones. Las lecturas de permisos consultan estado vigente en el servidor, no roles congelados en un token.

Los expedientes tienen mínimo necesario: número, nombre, departamento, puesto, ingreso civil, categoría, estado, superior y usuario opcionales. Se impiden ciclos y duplicados. Las asignaciones de titulares se cierran sin borrarse; las suplencias finitas se vinculan a la jefatura original y se invalidan al cerrar esa fuente. La auditoría general/notificaciones siguen fuera de alcance.

## Acceso inicial y recuperación

CLI interactiva para primer administrador, sin contraseña predeterminada ni bootstrap HTTP. Cuenta inicial rechazada si ya existe ADMIN. Recuperación por código de un uso con vencimiento, generado por ADMIN o por CLI local de recuperación del administrador; almacenamiento hasheado. No se simula envío de correo.

## Límites

Los límites de intentos viven en el proceso y se reinician al reiniciarlo; un despliegue de varias réplicas requerirá una estrategia compartida. Producción necesita HTTPS y origen configurado, gestión operativa de secretos y las verificaciones de etapa 18. No se implementan todavía autorizaciones de solicitudes, horarios, marcajes ni vacaciones.

Fuentes: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
