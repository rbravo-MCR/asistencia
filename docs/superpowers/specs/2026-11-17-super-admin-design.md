# Superadministración técnica independiente

## Petición autorizada

El usuario solicita configurar a la persona administradora designada como superAdmin después de distinguir permisos laborales y permisos de usuarios. Se incorpora SUPER_ADMIN como rol real superior a ADMIN y se asigna a su cuenta activa ya vinculada. CEO conserva ADMIN. La aprobación laboral HEAD_ONLY no cambia ni concede firma automática a un rol técnico.

## Diseño

SUPER_ADMIN incluye todas las facultades técnicas de ADMIN: usuarios/roles, organización, configuración, consulta global, auditoría, recuperación y notificaciones administrativas. En pantalla se denomina “Super administrador”. Mantener ADMIN con sus facultades actuales sobre cuentas ordinarias.

Solo un SUPER_ADMIN activo puede crear, editar, retirar, desactivar o emitir recuperación para cuentas SUPER_ADMIN. Aplicar esta regla en servidor, dentro de transacciones con bloqueo de identidad, incluso cuando se intente alterar/eliminar/desvincular el expediente asociado o sus responsabilidades. Proteger al último SUPER_ADMIN activo contra retirada/desactivación, independientemente de que existan otros ADMIN. Mantener también protección de último administrador técnico para instalaciones previas sin SUPER_ADMIN.

La interfaz ADMIN muestra las cuentas protegidas como lectura y no ofrece asignar SUPER_ADMIN; el servidor rechaza peticiones forjadas. El rol se valida en contratos, dominio, sesiones, formularios y consultas administrativas de módulos existentes.

La recuperación local del propietario del servidor sigue disponible mediante `admin:recovery`, incluyendo SUPER_ADMIN, sin permitir recuperación desde un ADMIN ordinario en HTTP. El primer SUPER_ADMIN de esta instalación se provisiona mediante mantenimiento local auditado, autorizado por el usuario, sin un endpoint de elevación pública ni nuevas credenciales.

Promoción: aplicar migración aditiva de enum, conservar nombre/correo/contraseña y EMPLOYEE, sustituir ADMIN por SUPER_ADMIN únicamente en la cuenta confirmada. Revocar sesiones y tokens de recuperación previos para evitar reutilización tras elevar privilegios. Conservar jefaturas, CEO y demás cuentas.

## Verificación

TDD para contrato y dominio. PostgreSQL `_test` con sesiones/CSRF reales: alcance global, gestión/configuración/auditoría, creación de SUPER solo por SUPER, edición/recuperación/desactivación/desvinculación/expediente protegidos, último SUPER, bootstrap sin duplicados y roles revocados. UI muestra y protege acciones por jerarquía. E2E crea cuentas de prueba controladas y comprueba bloqueos reales en escritorio/móvil. Suites completas, revisión independiente, migración repetida y promoción verificada en desarrollo.

Sin modificar aprobación laboral, datos empresariales, políticas de asistencia/vacaciones, correos o contraseñas, ni desplegar/publicar.
