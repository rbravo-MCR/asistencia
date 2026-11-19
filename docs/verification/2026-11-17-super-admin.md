# Superadministración técnica

## Alcance

Petición explícita: configurar a la persona administradora designada como superadministrador real, distinto del rol ADMIN. La aprobación laboral definitiva de jefatura y las responsabilidades organizativas existentes se conservan.

El rol SUPER_ADMIN incluye el alcance técnico global de ADMIN. Un ADMIN no puede asignárselo, modificar una cuenta protegida, desactivarla ni emitir recuperación para ella. Las mismas guardas protegen los expedientes vinculados y las responsabilidades, incluidas suplencias dependientes al reemplazar o revocar una jefatura. La identidad del actor procede del contexto autenticado del servidor y se revalida bajo bloqueo transaccional; no se acepta por HTTP.

El último SUPER_ADMIN activo no puede perder el rol ni desactivarse aunque existan otros ADMIN. El CLI de recuperación local mantiene acceso a las cuentas protegidas desde el servidor, sin introducir credenciales predeterminadas. La pertenencia a SUPER_ADMIN no concede autoridad para aprobar solicitudes laborales sin jefatura/suplencia competente.

## Verificación

- Pruebas específicas de dominio/contrato y UI con ciclo RED/GREEN.
- Integración PostgreSQL: autorización real con sesiones/CSRF; escalamiento bloqueado, edición y recuperación protegidas, rollback de cambios de empleados, última cuenta, recuperación local, acceso SUPER sin ADMIN, aprobación laboral independiente y revocación de sesiones/tokens al promover.
- Regresiones adicionales: una suplencia protegida no se revoca indirectamente al cerrar al titular; un actor que pierde autoridad mientras espera el bloqueo no modifica expedientes ordinarios.
- Revisión independiente: dos hallazgos P2 corregidos y revisados; sin P1/P2 pendientes en el alcance revisado.

## Resultado efectivo

- `pnpm check`: salida 0; lint, límites de módulos, formato, tipos, 175 pruebas unitarias/UI y compilación API/web.
- `pnpm test:integration`: salida 0; 165 pruebas PostgreSQL.
- Playwright completo: salida 0; 32 pruebas de escritorio/móvil. Capturas de Usuarios revisadas en ambos tamaños; sin desbordamiento horizontal.
- Total: 372 pruebas aprobadas.
- Migración 0011 aplicada en desarrollo y repetida con salida 0; enum SUPER_ADMIN disponible.

La cuenta vinculada al expediente autorizado fue promovida en una transacción local con bloqueos de organización e identidad y auditoría USER_UPDATED. Roles persistidos: SUPER_ADMIN y EMPLOYEE; se retiró ADMIN para comprobar que el nuevo rol es suficiente. Se verificó igualdad de todos los campos de la cuenta, incluida la contraseña, sin imprimir sus valores sensibles. Las sesiones y códigos de recuperación previos quedaron revocados. Los roles de otras cuentas y todas las responsabilidades permanecieron idénticos; el CEO conserva ADMIN.

El titular debe iniciar sesión nuevamente. Esta evidencia es local sobre la base de desarrollo, sin despliegue ni certificación de producción.
