# Primera entrega: navegación y base de Departamentos

## Alcance

El usuario autoriza los puntos 1, 2 y 3: TanStack Router, definición y contratos de Departamentos, y persistencia PostgreSQL con migración Drizzle. Quedan fuera endpoints, pantalla CRUD, autenticación y los demás módulos.

## Navegación

Usar `@tanstack/react-router` con rutas en código, sin plugin de generación: es suficiente para dos rutas reales y permite crecer por módulos. Layout común con marca, navegación y contenido; `/` conserva la página inicial, `/estado` reutiliza el estado real de servicios y las rutas desconocidas muestran 404 con regreso al inicio. Probar carga directa, navegación y retroceso. La web sigue siendo SPA: producción requiere fallback de rutas al `index.html`, excepto `/api`.

## Definición mínima

Decisión de implementación para esta entrega:

- `id`: UUID generado por el servidor/repositorio.
- `name`: nombre obligatorio, normalizado a Unicode NFC y sin espacios externos; entre 1 y 100 caracteres. Conservar capitalización para presentación.
- `createdAt`: instante de creación UTC, asignado por PostgreSQL.

No agregar códigos internos, estados, descripción ni relaciones organizacionales sin un requisito. No sembrar departamentos ni inventar responsables.

Los nombres son únicos ignorando mayúsculas/minúsculas y espacios externos. PostgreSQL es la autoridad final de unicidad mediante índice sobre `lower(btrim(name))`, incluso bajo concurrencia. No se eliminan acentos ni se compactan espacios internos. La comparación usa la collation de la base; documentar que no implica equivalencia universal entre alfabetos.

## Organización y contratos

Dominio puro bajo `apps/api/src/modules/departments/domain/`, sin Fastify ni Drizzle. Persistencia privada bajo `infrastructure/`, esquema registrado desde la infraestructura global y API pública mínima en `modules/departments/index.ts`.

Contratos TypeBox en `packages/contracts/src/departments.ts`: entrada de creación `{ name }`, salida `{ id, name, createdAt }` y lista `{ items }`. Rechazar propiedades adicionales y nombres en blanco. Los contratos preparan el futuro HTTP, pero no registran rutas. La interfaz de repositorio permite crear y listar; errores de dominio distinguen nombre inválido y duplicado. Listado determinista por nombre e ID.

## Persistencia y pruebas

Nueva tabla `departments` con PK UUID, nombre con checks de longitud/no vacío/canonización, timestamp con zona horaria e índice único de nombre normalizado. Migración nueva generada por Drizzle; no editar migración ya aplicada.

Pruebas de dominio y contratos primero; PostgreSQL real para creación, lectura, conflictos concurrentes, restricciones y repetición de migraciones conservando datos. Pruebas de router en memoria y navegador de escritorio/móvil. Usar exclusivamente base `_test` para pruebas; migrar desarrollo solo tras comprobar SQL y regresión. No usar SQLite.

## Validación de entrada y normalización

El contrato JSON Schema de creación valida forma, nombre no vacío/no blanco y ausencia de U+0000. El límite semántico de 100 puntos de código se aplica en dominio después de NFC y trim, mediante el repositorio. No se impone `maxLength: 100` al texto bruto de entrada porque rechazaría una cadena NFD o con espacios que se vuelve válida al normalizar. La salida sí tiene `maxLength: 100`. El futuro endpoint debe usar ambas capas de validación; aprobar el esquema de entrada no sustituye la validación de dominio.
