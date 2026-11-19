# Modelo mínimo de Departamentos

Modelo implementado en los puntos 2 y 3; API y pantalla de creación/listado completadas en los puntos 4–7. Consultar `docs/api/DEPARTMENTS.md`.

## Tabla `public.departments`

| Columna      | Tipo           | Regla                                                            |
| ------------ | -------------- | ---------------------------------------------------------------- |
| `id`         | UUID           | PK, generado mediante `gen_random_uuid()`                        |
| `name`       | text           | Obligatorio, 1–100 puntos de código, NFC y sin espacios externos |
| `created_at` | timestamptz(3) | Obligatorio, generado por PostgreSQL                             |

El índice `departments_name_normalized_unique` garantiza unicidad por `lower(btrim(name))`. PostgreSQL rechaza nombres vacíos, demasiado largos o no canónicos, incluso al escribir sin pasar por el repositorio. La canonicalización de espacios cubre el conjunto eliminado por `String.prototype.trim`.

Los acentos y espacios internos se conservan. No hay relaciones con empleados, jefaturas ni departamentos superiores en esta versión.

## Dominio y acceso

- Dominio: `apps/api/src/modules/departments/domain/department.ts`.
- Esquema y repositorio privados: `apps/api/src/modules/departments/infrastructure/`.
- Interfaz pública: `apps/api/src/modules/departments/index.ts`.
- Contratos HTTP preparados: `packages/contracts/src/departments.ts`.

`createDepartmentRepository(db)` permite `create({ name })` y `list()`. La creación normaliza/valida antes de persistir y devuelve la entidad confirmada; el listado ordena por nombre e identificador. La entidad contiene `createdAt: Date`; su representación HTTP usa ISO UTC con milisegundos.

Errores de dominio: `InvalidDepartmentNameError` y `DepartmentNameAlreadyExistsError`. Los fallos de conexión u otros errores SQL no se convierten en duplicados.

## Migraciones

`0000` prepara `app_meta`; `0001_departments.sql` incorpora la tabla. Aplicar con `pnpm db:migrate`. Revisar nuevas migraciones antes de aplicarlas; nunca modificar SQL que ya se haya aplicado.

Las integraciones utilizan `_test`, limpian exclusivamente sus filas y crean una base temporal propia para probar toda la cadena desde cero. La prueba de base nueva requiere permiso `CREATEDB`; el contenedor local de pruebas lo proporciona. No usar credenciales productivas.

## Validación de entrada y normalización

El contrato JSON Schema de creación valida forma, nombre no vacío/no blanco y ausencia de U+0000. El límite semántico de 100 puntos de código se aplica en dominio después de NFC y trim, mediante el repositorio. No se impone `maxLength: 100` al texto bruto de entrada porque rechazaría una cadena NFD o con espacios que se vuelve válida al normalizar. La salida sí tiene `maxLength: 100`. El adaptador HTTP usa ambas capas de validación; aprobar el esquema de entrada no sustituye la validación de dominio.

## Integración vertical

El adaptador `http/routes.ts` invoca casos de uso en `application/use-cases.ts`, serializa fechas a ISO UTC y mapea errores de nombre a 400/409. El cliente React usa la API real para `/departamentos`. El esquema y las migraciones no cambiaron al incorporar HTTP/web. Editar y eliminar no forman parte del alcance actual.
