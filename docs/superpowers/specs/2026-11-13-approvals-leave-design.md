# Etapas 14–15: aprobaciones y ausencias

## Alcance autorizado

La petición del usuario autoriza implementar ambas etapas sobre el monolito existente, con API, PostgreSQL, web, pruebas y documentación. Se preserva el árbol sin commits. No publicación ni aplicación móvil. No nuevas dependencias.

Se elige un módulo `requests` para solicitudes, decisiones y saldos: mantiene los efectos de aprobación y negocio en una única transacción. Un motor genérico configurable de workflows sería innecesario para los dos pasos fijos; módulos separados con callbacks harían más difícil comprobar atomicidad. Esta elección técnica corresponde al implementador dentro del alcance solicitado.

## Reglas

- Tipos VACATION, PERMISSION, JUSTIFICATION y CANCELLATION. Creación propia por empleado activo; ADMIN/HR no suplantan solicitudes.
- Estados PENDING_HEAD, PENDING_DIRECTOR, APPROVED, REJECTED, WITHDRAWN y CANCELLED. Decisiones append-only, motivo obligatorio, UUID idempotente ligado a actor/operación/contenido. Un rechazo termina el flujo. No autoaprobación ni mismo actor para ambos pasos; ADMIN/HR no saltan la cadena.
- La solicitud congela departamento, fechas, política y días al enviarse. Jefe/suplente vigente del departamento congelado resuelve primer paso; suplencia valida fuente titular, intervalos y empleado/cuenta activos. Para solicitudes del propio jefe se usa exclusivamente su superior explícito, activo y distinto. Si no existe cadena válida, se informa y bloquea; no inventar responsable para dirección ni permitir autoaprobación.
- Dirección vigente otorga visto bueno. Revalidar responsabilidades dentro de la transacción bajo bloqueo compartido con organización; guardar evidencia de asignaciones y actor por paso. Lecturas propias, jefatura por departamento congelado y dirección/ADMIN/HR según alcance.
- Auditoría/outbox atómicas, avisos internos a empleado y responsables y RR. HH. en resoluciones; nunca adjuntos/motivos personales en notificaciones o snapshots generales.
- Vacaciones: políticas versionadas explícitas, calendario por categoría, tabla de días por antigüedad, exclusión configurable de festivos manuales. No saldos históricos inventados ni caducidad automática. Concesión por aniversario explícita ADMIN/HR idempotente, ajustes con motivo y libro de movimientos; saldo disponible descuenta reservas pendientes. Días solicitados, aprobados y disfrutados identificables por fechas congeladas. Nunca saldo negativo ni doble reserva concurrente. Política inicial a confirmar con el usuario; si no responde se mantiene configuración explícita sin concesiones automáticas.
- Permisos: catálogo configurable (con/sin goce, evidencia requerida, intervalo parcial permitido), sin inventar efectos de nómina. Intervalos civiles completos o instantes UTC parciales coherentes con fechas declaradas, máximos 93 días; impedir solapamientos entre solicitudes activas del mismo empleado.
- Justificación propia de incidencia existente: motivos y evidencias se conservan; efecto aprobado separado del evento/evaluación original. No aprobar por capturar el motivo de etapa13.
- Evidencias privadas opcionales al enviar, hasta 3 archivos de 1 MiB cada uno; PDF/PNG/JPEG por firma y MIME. Persistencia privada PostgreSQL, descarga autenticada con el mismo alcance de solicitud, attachment/nosniff, sin rutas de disco ni URL pública. Contenido inmutable después de enviar; tipos que exigen evidencia rechazan envío sin ella.
- Retiro propio antes de resolución final libera reserva y conserva motivo, actor y fecha privados. Se permite decisión tardía de una solicitud presentada en tiempo, sin inventar vencimiento de aprobación. Cancelación de una solicitud aprobada futura requiere solicitud separada y ambos pasos; rechazo no modifica la original. Aprobación cancela y revierte consumo exactamente una vez, conservando historia. No cancelar vacaciones ya iniciadas ni devolver días disfrutados mediante este flujo.
- Integración asistencia: ausencias aprobadas completas cubren el turno; permisos parciales no eximen jornada completa. La evaluación y las justificaciones se muestran por separado sin reescribir marcas ni incidencias originales. Cancelación deja de otorgar cobertura. Publicar turnos nuevos sobre ausencias aprobadas debe rechazarse.

## UX y verificación

Rutas `/solicitudes`, `/aprobaciones`, `/vacaciones` y `/politicas-ausencias`. Estados de carga/vacío/error/reintento, pendientes y éxito, historial de decisiones, saldos/movimientos, creación de solicitudes con archivos, retiros/cancelaciones y descargas privadas. Configuración ADMIN/HR y decisiones solo para actores habilitados por servidor.

Pruebas de dominio, HTTP/PostgreSQL, concurrencia, cadena jefe/director/suplencia, autoaprobación, UUID, rollback, saldo/reserva/reversión, antigüedad/año bisiesto, rangos, privacidad/archivos y asistencia cubierta/parcial. E2E escritorio/móvil con sesiones reales y persistencia, revisión independiente y regresión completa.
