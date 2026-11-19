# Seguridad, privacidad y gobernanza

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Fuente de verdad

Backend autoriza; ocultar menús no es autorización. Preservar guardas, `use-session`, `protected-page`, cliente HTTP y permisos existentes. Roles SUPER_ADMIN/ADMIN/HR/EMPLOYEE combinables; jefatura, suplencia y dirección son asignaciones vigentes. `canDecide` determina decisión. SUPER_ADMIN técnico no otorga autoridad laboral. No elevar privilegios desde UI. Proteger último SUPER_ADMIN y cuentas privilegiadas según API.

## Sesión y datos

Cookie HttpOnly, SameSite Strict, Secure en producción, sin tokens localStorage/JWT. Writes con `x-csrf-token` y Origin validado; preservar mecanismos existentes. Logout/revocación/cambio de cuenta limpia Query cache y estado privado. No persistir tokens, GPS, evidencias, motivos, datos de contacto ni respuestas de API en almacenamiento del navegador, analytics o logs. Preferencias visuales no sensibles sí pueden persistir. No renderizar HTML sin sanitizar; React escaping por defecto.

## Marcajes y operaciones

UUID/payload exactos ante resultado desconocido; 409 conflicto no se oculta. Validar `attempt.accepted`. Hora servidor, no modificar eventos originales. Home office no GPS; presencial solicita ubicación fresca en marcaje y servidor valida centro/precisión. No geolocalización en fondo. Permisos de ubicación se explican antes de solicitar. No usar coordenadas personales en dashboards.

## Evidencias y privacidad

Hasta 3 archivos de 1 MiB binario cada uno, PDF/PNG/JPEG; servidor valida firma y MIME. No cambiar límite, no guardar en rutas públicas, no ofrecer preview inline de archivo privado si contrato descarga como attachment. No enviar razones/archivos por notificaciones. Recuperación muestra código una vez, no autosave ni logs. Error usuario sanitizado; requestId cuando útil para soporte, sin stack trace.

## Gobernanza

Auditoría inmutable y outbox transaccional existentes. No sustituir por logs del navegador, no crear auditoría ficticia. Avisos internos, sin promesa correo/SMS/push. Preservar snapshots y fechas UTC/civiles según contrato. Configuración nueva no reescribe registros previos. No copiar datos reales a fixtures/screenshots.

## Gates

Verificar 401/403/404 alcance, CSRF, doble envío, cambio/expiración sesión, enlaces internos y datos ausentes en respuestas. Prueba directa de rutas sin permisos. Cambios de seguridad, negocio, dependencias y contratos requieren revisión explícita. No desactivar controles para hacer funcionar una demo.
