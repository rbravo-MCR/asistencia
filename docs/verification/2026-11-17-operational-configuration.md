# Punto 2: configuración operativa — revisión de datos

## Estado

Estado actualizado al 18-11: jefaturas y cuenta del CEO vinculadas, SUPER_ADMIN configurado, política LFT v1 publicada, permisos por horas, calendario oficial 2026–2027 y corte administrativo desde 08:30 con marcaje aceptado y falta justificable. Continúan pendientes los datos para jornadas/centros, períodos/saldos y correos. Las secciones iniciales conservan la revisión histórica anterior a estas confirmaciones; ver las actualizaciones al final y la evidencia de continuación. No se declara cierre operativo ni producción.

Revisión del 17 de noviembre de 2026 mediante consultas de lectura en PostgreSQL 18.6, base `asistencia`, host local, puerto 55432. También se ejecutaron los lectores públicos de diagnóstico que utiliza `/configuracion`. No se iniciaron workers, publicaron turnos ni modificaron datos.

## Configuración existente

- 6 empleados activos, clasificados actualmente como administrativos.
- 7 departamentos; 3 tienen empleados activos.
- 4 plantillas activas: jornada administrativa lunes a viernes 08:00–17:00 y tres turnos operativos home office 08:00–16:00, 16:00–00:00 y 00:00–08:00.
- 1 centro activo, radio de 10 m y precisión máxima de 10 m.
- Política de asistencia v1: tolerancia de 10 minutos, anticipación de entrada de 30 minutos y margen de salida de 120 minutos. Los márgenes 30/120 siguen requiriendo validación operativa; estar almacenados no constituye confirmación empresarial.

## Diagnóstico inicial (antes de las confirmaciones)

| Código                          | Resultado                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| DIRECTOR_REQUIRED               | No hay dirección vigente; existe una asignación histórica revocada que debe conservarse.         |
| HEAD_REQUIRED                   | 3 departamentos con personal activo sin jefatura válida.                                         |
| EMPLOYEE_ACCOUNT_REQUIRED       | 1 empleado sin cuenta activa vinculada.                                                          |
| APPROVAL_CHAIN_REQUIRED         | 6 empleados sin cadena completa de aprobación.                                                   |
| LOCATION_AUTHORIZATION_REQUIRED | 6 empleados presenciales sin autorización vigente del centro.                                    |
| LEAVE_POLICY_REQUIRED           | No hay política de vacaciones.                                                                   |
| PERMISSION_TYPES_REQUIRED       | No hay tipos de permiso.                                                                         |
| NO_VACATION_PERIODS             | 6 empleados sin períodos concedidos; informativo, no implica derecho automático a una concesión. |
| NO_UPCOMING_SHIFTS              | No hay turnos publicados para el intervalo 2026-11-17 a 2026-11-23.                              |
| NO_HOLIDAYS                     | No hay festivos cargados; requiere calendario aplicable de la empresa.                           |

Los nombres, correos y datos individuales no se copian a esta documentación. Se conservan en los expedientes y se consultan con el alcance autorizado.

## Información necesaria para concluir

1. Dirección aprobadora, jefaturas por departamento y superiores explícitos de los jefes. Un puesto denominado Director no asigna automáticamente autoridad. No reactivar responsabilidades revocadas sin una designación confirmada.
2. Modalidad y horario de cada empleado, fecha de inicio de asignaciones, descansos/rotaciones cuando correspondan y autorización del centro presencial. Confirmar los márgenes de entrada/salida antes de utilizarlos operativamente.
3. Política empresarial de vacaciones: tabla por antigüedad, días laborables por categoría, tratamiento de festivos y períodos/saldos de apertura respaldados por RR. HH. No reconstruir saldos históricos a partir de la fecha de ingreso.
4. Tipos de permiso, goce de sueldo, posibilidad de intervalos parciales y evidencia requerida; calendario de festivos aplicable.
5. Correo confirmado de la persona sin cuenta, si debe ingresar. Las contraseñas se configuran por un mecanismo privado; no deben solicitarse ni guardarse en esta documentación.

## Cierre previsto tras recibir los datos

Aplicar cambios mediante los servicios y controles existentes, preservar responsabilidades históricas y registrar motivos/actor. Autorizar centros antes de publicar jornadas presenciales. Conceder/ajustar períodos con movimientos explícitos. Comprobar persistencia y ejecutar nuevamente el diagnóstico. La aceptación funcional se verifica en un entorno de prueba, sin generar marcajes o solicitudes ficticias en desarrollo.

La certificación y despliegue de producción corresponden al punto 3; la app móvil permanece al final.

## Definiciones recibidas posteriormente

El usuario confirmó horario 08:00–17:00, tolerancia de 10 minutos, falta a partir de las 08:30, vacaciones conforme a la LFT con 12 días en el primer año y correos en archivo externo. El horario y la tolerancia coinciden con los valores existentes.

La escala del artículo 76 se verificó en el [texto vigente de la Cámara de Diputados](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf), última reforma indicada 14-05-2026: años 1–5, 12/14/16/18/20 días; años 6–10, 22; años 11–15, 24; después aumenta dos días por cada bloque de cinco años. El archivo `config/policies/lft-vacation-entitlements.json` conserva las reglas hasta el máximo de 100 años admitido por el sistema. Es una referencia de configuración; todavía no es una política publicada ni una concesión de saldo.

Queda precisar la correspondencia de las tres personas indicadas con las responsabilidades, la jefatura de Marketing Digital, la fecha de inicio de jornadas y si el archivo externo contendrá direcciones de empleados o configuración SMTP. También se preguntó si el marcaje desde las 08:30 se conserva como entrada con falta justificable o se rechaza conservando el intento. La regla actual evalúa faltas al cierre y no implementa todavía ese nuevo corte.

Los saldos históricos, períodos de apertura y tipos de permiso siguen sin datos confirmados. La escala legal no permite deducir cuántos días disponibles conserva una persona después de sus vacaciones ya utilizadas.

## Acceso del CEO confirmado

El usuario confirmó que el CEO debe tener acceso global a todas las áreas del sistema. La implementación existente representa ese alcance con el rol ADMIN: consulta general, gestión de usuarios y roles, organización, configuración y auditoría. No hace falta crear un rol técnico duplicado ni limitarlo a un departamento.

Se comprobó en PostgreSQL que el expediente del CEO existe y todavía no tiene cuenta vinculada. El acceso efectivo queda pendiente de crear/vincular esa cuenta con el correo configurado externamente; no se inventan direcciones ni contraseñas. La confirmación del acceso global no cambia por sí sola las asignaciones organizacionales del circuito de aprobaciones.

## Elevación administrativa solicitada

Por instrucción explícita del usuario se concedió ADMIN a su cuenta activa vinculada, conservando EMPLOYEE. ADMIN es el nivel técnico máximo existente y otorga acceso administrativo global; todavía no existe una categoría SUPER_ADMIN distinta y superior a otros administradores.

El cambio se aplicó mediante el servicio de identidad existente. Se verificaron la persistencia de ambos roles, conservación de nombre/correo/estado, auditoría USER_UPDATED y revocación de sesiones previas. La auditoría identifica la operación como mantenimiento local sin suplantar una sesión web. No se cambiaron otras cuentas ni responsabilidades.

El usuario indicó además que jefatura debe ser el nivel más alto para administración de permisos. Se solicitó aclarar si se refiere a permisos de acceso o permisos laborales y, en este último caso, si continúa el visto bueno del CEO. Esa modificación de autoridad no se ha aplicado mientras se precisa su alcance.

## Aprobación definitiva confirmada

El usuario confirmó que jefatura decide definitivamente los permisos laborales. El flujo de las solicitudes nuevas es HEAD_ONLY; no requiere visto bueno posterior del CEO. La versión HEAD_DIRECTOR solo se conserva para solicitudes históricas. La migración 0010 se aplicó en desarrollo sin crear solicitudes ni alterar roles de usuarios. Ver `docs/verification/2026-11-17-head-final-approval.md` para evidencia y límites. Esta decisión sustituye la pregunta pendiente sobre una segunda firma.

El diagnóstico tabulado al inicio corresponde a la revisión anterior al cambio de flujo. En la regla vigente HEAD_ONLY, la ausencia de dirección ya no es un bloqueo; siguen siendo necesarias las jefaturas/superiores válidos y los demás datos operativos pendientes.

## Jefaturas formalizadas

Por instrucción explícita del usuario se crearon tres asignaciones HEAD, con vigencia inmediata, para Administración, TI y Marketing Digital. Se utilizó el servicio de organización existente y la cuenta administrativa autorizada como actor. Se verificaron empleados/cuentas activos, pertenencia al departamento, alcance de gestión efectivo y tres registros de auditoría RESPONSIBILITY_ASSIGNED.

Las responsabilidades históricas permanecen idénticas; no se reactivó la antigua asignación de dirección revocada. No se modificaron roles de usuario, superiores, correos, saldos ni solicitudes.

El diagnóstico ya no informa HEAD_REQUIRED ni falta de cadena para empleados ordinarios. Persisten dos jefaturas con superior explícito sin cuenta activa vinculada: la cuenta pendiente del CEO es necesaria para resolver las solicitudes propias de esas jefaturas, sin autoaprobación. La tercera jefatura tiene un superior activo disponible.

## Vinculación de la cuenta del CEO

Por instrucción explícita del usuario se vinculó el expediente del CEO a la única cuenta administrativa activa que estaba sin expediente. Se verificó el rol ADMIN y se conservaron íntegros nombre de cuenta, identificador de ingreso, correo y contraseña existentes. La modificación utilizó el servicio de empleados, con auditoría EMPLOYEE_UPDATED y la cuenta administrativa autorizada como actor.

La comparación posterior confirmó que solo cambió el vínculo de usuario del expediente y su fecha de actualización; roles de usuarios, responsabilidades y demás campos del expediente se conservaron. El diagnóstico dejó de informar EMPLOYEE_ACCOUNT_REQUIRED, HEAD_SUPERIOR_REQUIRED, HEAD_REQUIRED y APPROVAL_CHAIN_REQUIRED. La estructura de jefaturas y superiores ya es válida para la aprobación laboral definitiva.

Siguen pendientes política de vacaciones publicada, tipos de permiso y períodos/saldos de apertura. La tabla LFT preparada como referencia no crea por sí misma esos saldos.

## Superadministración real configurada

La petición posterior de configurar superAdmin sustituye la asignación provisional de ADMIN descrita antes. Se implementó el rol SUPER_ADMIN distinto y la cuenta autorizada conserva ahora SUPER_ADMIN y EMPLOYEE, con acceso técnico completo y protección frente a administradores inferiores. Se preservaron sus credenciales y datos de acceso; se revocaron sesiones/códigos anteriores y se registró auditoría. Las demás cuentas, la cuenta del CEO con ADMIN y las jefaturas permanecieron idénticas. La aprobación laboral continúa siendo definitiva en jefatura.

Migración 0011 aplicada/repetida y 372 pruebas aprobadas; ver [evidencia de superadministración](2026-11-17-super-admin.md). Cambio verificado en desarrollo, sin despliegue de producción.

## Continuación operativa autorizada

La política de vacaciones LFT ya se publicó como versión 1 y se verificó una repetición sin duplicación. Esto sustituye el estado anterior de «solo referencia»; los saldos y períodos de apertura siguen pendientes de RR. HH. Se preservaron cuentas/roles, jefaturas, política de asistencia, jornadas y autorizaciones. El corte 08:30 sigue pendiente de confirmar el tratamiento del marcaje.

Se completaron respaldo y restauración local aislada y se reforzó la exigencia de HTTPS en configuración production. El diagnóstico actual conserva pendientes de tipos de permiso, períodos, jornadas, centros y festivos. Ver [evidencia de continuación](2026-11-17-operational-readiness.md) y [guía de operación](../PRODUCTION.md). No se declara despliegue ni certificación de producción.

## Actualización de permisos del 18 de noviembre

El usuario definió permisos por horas para entrada tardía y salida anticipada, con mínimo 24 horas de anticipación, motivo obligatorio y sin comprobante obligatorio. Confirmó goce de sueldo inicial y posibilidad de cambiarlo después. Los dos tipos se configuraron mediante el servicio auditado; los cambios posteriores conservan snapshots de solicitudes anteriores. Esto resuelve el pendiente de catálogo de permisos de las revisiones anteriores. Ver [evidencia y condiciones](2026-11-18-hourly-permissions.md).

También confirmó períodos de vacaciones conforme a la LFT; la política ya publicada se conserva. La definición legal de días no determina los días utilizados, por lo que continúan pendientes los saldos/períodos de apertura respaldados por RR. HH., además de jornadas/centro, festivos, corte 08:30, correos y producción.

## Festivos y corte administrativo confirmados posteriormente

El usuario indicó entregar solo calendarios oficiales y aceptar el marcaje desde 08:30 como justificable. Se cargaron 15 fechas oficiales LFT/INE de 2026–2027 y se publicó política de asistencia v2 con corte administrativo de 30 minutos. Se conservan hora real, GPS y flujo de justificación de jefatura; las políticas históricas no se reescriben. Esto sustituye los pendientes de festivos y tratamiento del corte de los apartados históricos. Ver [verificación actual](2026-11-18-official-holidays-attendance.md).
