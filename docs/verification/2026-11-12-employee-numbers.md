# Números de empleado y acceso del administrador

## Alcance

- Función pública `generateEmployeeNumber(db)` con contador PostgreSQL persistente y UPSERT atómico; mínimo seis dígitos, considera números existentes y reserva `999999`.
- Alta HTTP sin `employeeNumber` genera el número en la transacción del expediente. Edición requiere número explícito. El formulario de empleados mantiene la captura manual y no se automatiza la creación de cuentas en esta entrega del backend.
- Identificador numérico de usuario único; administrador inicial `999999`. Ingreso nuevo con `identifier`, compatible con clientes que envían `email`; sesiones, permisos y contraseña sin cambios de política.
- Migración `0003_cynical_machine_man.sql` aplicada en desarrollo.

## Verificación

| Comprobación            | Resultado                                                 |
| ----------------------- | --------------------------------------------------------- |
| `pnpm check`            | 93 pruebas, lint, formato, tipos y compilación pasan      |
| `pnpm test:integration` | 63 pruebas PostgreSQL pasan                               |
| `pnpm test:e2e`         | 12 pruebas en escritorio y móvil pasan                    |
| Chromium en desarrollo  | Ingreso con `999999`: 200; recarga; logout seguido de 401 |
| Revisión independiente  | Sin hallazgos P1/P2 en contador, acceso y modularidad     |

Las regresiones fallaron antes del cambio: función ausente, alta sin número 400 y acceso numérico 400. Las nuevas pruebas verifican concurrencia, persistencia desde otra conexión, conservación de números previos, salto de `999999`, alta automática y compatibilidad de edición/acceso.

La primera ejecución E2E coincidió con una base de pruebas sin la migración nueva. Se completaron las migraciones y se repitió la suite completa: 12/12. Las pruebas funcionales usan exclusivamente bases `_test`.

## Limpieza solicitada

Se eliminaron de desarrollo los tres empleados `0001`–`0003`, sin usuarios ni responsabilidades vinculadas, y las dos cuentas adicionales con sus sesiones y códigos de recuperación. Se conservaron la cuenta administradora, su contraseña y los seis departamentos. Resultado comprobado: cero empleados, un usuario activo con identificador `999999`, seis departamentos. No se añadieron empleados ni cuentas de demostración.
