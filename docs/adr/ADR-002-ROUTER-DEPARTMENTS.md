# ADR-002: Navegación y base de Departamentos

Fecha: 2026-11-12. Estado: implementada en desarrollo local.

## Alcance

El usuario autorizó únicamente los puntos 1, 2 y 3 de la primera entrega: router, definición/contratos y persistencia. Los endpoints y la pantalla de Departamentos se implementarán después.

## Router

Se instala `@tanstack/react-router` **1.170.46**, estable consultada en npm, compatible con React 19 y Node 26. Las rutas están definidas en código: `/` y `/estado`, con layout común y fallback 404. Esta elección mantiene la configuración inicial pequeña, sin plugin ni árbol generado. Se puede incorporar generación por archivos cuando el número de pantallas lo justifique.

Las páginas están separadas de la composición del router y reutilizan los componentes existentes. TanStack Query permanece en el provider de aplicación. Los tests usan historial en memoria; Playwright comprueba enlaces, ruta directa, recarga, retroceso y recuperación desde 404.

## Departamentos

Se elige una entidad mínima: UUID, nombre y fecha de creación. No se agregan códigos, descripción, estado, jefes ni jerarquías sin requisitos adicionales.

El nombre se normaliza a NFC y se eliminan espacios externos; debe tener entre 1 y 100 puntos de código Unicode. La tabla conserva la capitalización. La unicidad se aplica sobre `lower(btrim(name))`, con la collation de PostgreSQL. No se eliminan acentos ni espacios internos. No se afirma equivalencia universal entre alfabetos.

El dominio no importa HTTP ni persistencia. El repositorio Drizzle es privado; la interfaz pública del módulo expone su factory, tipos y errores de negocio. El registro global de esquemas importa el esquema de persistencia para componer Drizzle; no representa acceso entre módulos de negocio.

## Contratos y persistencia

TypeBox publica entrada `{ name }`, salida `{ id, name, createdAt }` y lista `{ items }`; todas rechazan propiedades adicionales. El timestamp HTTP se prepara como ISO UTC con milisegundos; la entidad y el repositorio usan `Date`.

La migración `0001_departments.sql` crea `public.departments`, UUID automático, timestamp con zona horaria, checks de longitud/NFC/espacios e índice único. No modifica la migración inicial ni inserta datos de negocio. La unicidad se garantiza en PostgreSQL bajo concurrencia; el repositorio transforma exclusivamente el conflicto de ese índice en `DepartmentNameAlreadyExistsError`.

## Consecuencias

La persistencia puede probarse antes de disponer de API o formulario. Los endpoints futuros deberán serializar `createdAt` con `toISOString()` y mapear errores de dominio a respuestas HTTP. No se incorpora actualización/eliminación ni lógica de aprobaciones.

Las rutas de SPA requieren fallback a `index.html` en producción y proxy separado para `/api`. Un 404 de la SPA muestra una pantalla de no encontrado; el servidor estático puede responder HTTP 200 al entregar el shell, sin SSR.

## Referencia

[Documentación oficial de rutas definidas en código](https://tanstack.com/router/latest/docs/framework/react/routing/code-based-routing).

## Validación de entrada y normalización

El contrato JSON Schema de creación valida forma, nombre no vacío/no blanco y ausencia de U+0000. El límite semántico de 100 puntos de código se aplica en dominio después de NFC y trim, mediante el repositorio. No se impone `maxLength: 100` al texto bruto de entrada porque rechazaría una cadena NFD o con espacios que se vuelve válida al normalizar. La salida sí tiene `maxLength: 100`. El futuro endpoint debe usar ambas capas de validación; aprobar el esquema de entrada no sustituye la validación de dominio.
