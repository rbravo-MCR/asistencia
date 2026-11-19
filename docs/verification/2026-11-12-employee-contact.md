# Celular y dirección del empleado

Implementados en PostgreSQL, contratos, API, formulario de alta/edición y consulta del expediente. Ambos son opcionales y nullable. Los registros anteriores quedan sin contacto registrado; no se inventan valores.

- `phoneNumber`: 7–15 dígitos y + inicial opcional; elimina espacios, paréntesis, puntos y guiones.
- `address`: NFC, trim y máximo 500 puntos de código Unicode; admite varias líneas y rechaza caracteres nulos.
- En PUT, omitir un campo conserva su valor anterior; null o texto vacío lo borra.
- El alcance de acceso al expediente permanece vigente para ambos datos.

Migración `0004_silent_impossible_man.sql` aplicada en desarrollo. Columnas verificadas como nullable, con restricciones de formato/longitud. Sin dependencias nuevas.

## Evidencia

| Verificación            | Resultado                                    |
| ----------------------- | -------------------------------------------- |
| `pnpm check`            | 101 pruebas, lint, formato, tipos y build OK |
| `pnpm test:integration` | 68 pruebas PostgreSQL OK                     |
| `pnpm test:e2e`         | 14 pruebas escritorio/móvil OK               |
| Revisión independiente  | Sin hallazgos P1/P2                          |

Se observó RED antes del cambio: la API rechazaba los campos y el formulario no los ofrecía. Las regresiones verifican alta, consulta SQL, edición, normalización, límites Unicode, eliminación explícita de valores, conservación por omisión y persistencia tras recargar. Las pruebas funcionales utilizan exclusivamente bases `_test`.
