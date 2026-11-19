# CRUD de departamentos y empleados

## Resultado

- Departamentos: creación/listado existentes, edición de nombre y eliminación en API/web. PUT conserva UUID/fecha y valida normalización/unicidad. DELETE impide eliminar departamentos con empleados o responsabilidades vinculadas.
- Empleados: creación, consulta y edición existentes, más eliminación confirmada. Se rechaza borrar expedientes con responsabilidades registradas o subordinados, incluso si las responsabilidades están revocadas; usar inactivación para conservar historial.
- Eliminar un empleado desactiva su cuenta vinculada y revoca sus sesiones dentro de la misma transacción. Una eliminación rechazada revierte esos cambios. La protección del último ADMIN se conserva; no se elimina físicamente la cuenta.
- Escrituras ADMIN/HR con sesión y CSRF; no se ofrecen acciones a usuarios de consulta. Confirmación/cancelación de borrado y errores recuperables, sin reintentos automáticos de escrituras.
- Sin dependencias ni migraciones nuevas. Las claves foráneas existentes protegen las relaciones y la concurrencia.

## Verificación final

| Comando                 | Resultado                                                        |
| ----------------------- | ---------------------------------------------------------------- |
| `pnpm check`            | 100 pruebas unitarias/UI; lint, formato, tipos y build correctos |
| `pnpm test:integration` | 67 pruebas PostgreSQL correctas                                  |
| `pnpm test:e2e`         | 14 pruebas de escritorio/móvil correctas                         |
| Revisión independiente  | Sin hallazgos P1/P2 en autorización/transacciones/FK             |

Las regresiones de PUT/DELETE devolvían 404 y los botones no existían antes del cambio. Se verificaron edición/eliminación persistidas tras recargar, CSRF, roles, UUID inválidos, duplicados, 404/409, referencias y último ADMIN.

La prueba móvil descubrió desbordamiento horizontal por los botones con nombres completos (542 px de documento frente a 412 px de viewport). Se añadió una regresión contra `documentElement.clientWidth` y se acortaron los textos visibles a Editar/Eliminar, conservando etiquetas accesibles con el nombre completo. La prueba pasó sin forzar clics ni ampliar timeouts; también pasó la suite completa posterior.

Las pruebas funcionales crearon y limpiaron únicamente sus datos en bases `_test`. No se ejecutaron eliminaciones de registros de desarrollo durante esta entrega. Las aprobaciones y la auditoría general siguen siendo etapas pendientes.
