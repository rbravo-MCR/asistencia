# Auditoría y avisos internos

## Auditoría

`GET /api/audit-events?limit=50&offset=0&entityType=department&action=DEPARTMENT_CREATED` devuelve `{items,total}`. Solo ADMIN puede consultarla. Los filtros son opcionales; limit admite 1–100, offset es numérico. Cada evento conserva UUID, actor, solicitud/correlation ID, acción, entidad, antes/después y fecha UTC.

Se registran transaccionalmente cambios en usuarios, empleados, departamentos, responsabilidades, horarios y ubicaciones. También acceso, salida, cambio de clave y recuperación. CLI/operaciones del sistema pueden tener actor null. La auditoría comienza con esta etapa; no se inventa historial anterior.

Los snapshots excluyen claves, hashes, tokens, cookies, contactos (correo/celular/dirección) y coordenadas personales. `changedFields` identifica los campos modificados sin conservar valores de contacto. No hay API para editar o eliminar auditoría. Un fallo al insertarla revierte el cambio de negocio.

## Bandeja propia

- `GET /api/notifications` → `{items,unreadCount}`, hasta 100 avisos recientes del usuario autenticado.
- `POST /api/notifications/:id/read` → 204, idempotente y solo para el destinatario.
- `POST /api/notifications/read-all` → 204, solo para la bandeja propia.

Los POST requieren sesión y CSRF. Otro destinatario recibe 404. Los avisos incluyen título, mensaje, ruta interna segura, fecha y lectura. Se generan al publicar/cancelar turnos, cambiar autorizaciones de centro o actualizar cuenta/acceso.

## Entrega persistente

La misma transacción del cambio crea el evento y su outbox. Un worker inserta el aviso y confirma su entrega en otra transacción. Las restricciones únicas por evento/destinatario y outbox evitan duplicados; `FOR UPDATE SKIP LOCKED` permite procesadores concurrentes. Los pendientes sobreviven al reinicio y se reintentan; no dependen de memoria del proceso.

`NOTIFICATION_WORKER_ENABLED=true|false` controla el worker. Por defecto funciona en desarrollo/producción y se desactiva en pruebas unitarias/integración; los E2E lo activan explícitamente para verificar entrega real. Al cerrar la API, se detiene el intervalo y se espera la entrega activa.

Esta entrega es **dentro del sistema** (`/avisos`). No configura SMTP, no simula envíos de correo y no envía SMS ni notificaciones externas. No introduce dependencias nuevas.
