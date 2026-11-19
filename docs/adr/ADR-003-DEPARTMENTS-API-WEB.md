# ADR-003: API y pantalla de Departamentos

Fecha: 2026-11-12. Estado: implementada y verificada localmente.

## Alcance y decisión

El usuario autorizó los puntos 4–7. Se completa creación y listado usando el dominio, contratos y persistencia de los puntos 1–3, sin modificar migraciones aplicadas.

Se agregan casos de uso explícitos y un adaptador HTTP de módulo. El bootstrap registra el repositorio y las rutas mediante la interfaz pública. Fastify rechaza propiedades adicionales y tipos incompatibles mediante AJV sin coerción, sin eliminación de campos y sin defaults implícitos. El módulo traduce nombre inválido a 400 y duplicado a 409; otros errores se delegan al handler central sanitizado.

GET devuelve una lista real; POST devuelve 201 tras persistencia y serializa el instante de creación a ISO UTC. No se implementan edición, eliminación, autenticación ni gestión de empleados.

## Web y dependencias

Se agrega `/departamentos` a TanStack Router y a la navegación. La pantalla usa TanStack Query, componentes shadcn/ui y formulario accesible con React Hook Form **7.92.0**, `@hookform/resolvers` **7.0.6** y Zod **4.6.7**. Versiones estables y peers consultados en npm antes de instalar; versiones exactas y lockfile conservados.

El formulario normaliza NFC/trim y cuenta puntos de código Unicode. No usa un maxLength HTML que bloquee nombres NFD válidos. Conserva el texto tras errores, bloquea envío pendiente, anuncia éxito/error y refresca el listado solo tras confirmación del servidor. POST no tiene retries automáticos; ante falta de confirmación se solicita actualizar el listado antes de reintentar.

La lista muestra nombre y fecha de creación en `es-MX`, zona inicial `America/Merida`. No se muestran IDs técnicos. En móvil el formulario aparece antes del listado; en escritorio se distribuyen en dos columnas. No se agregan búsqueda/paginación ni TanStack Table para un listado mínimo que no las requiere.

## Pruebas y consecuencias

Integración HTTP en una base temporal propia; E2E en el servidor `_test` crea registros únicos, comprueba PostgreSQL directamente y limpia solo esos IDs. Se verifica la API compilada mediante un proceso separado y una base temporal de pruebas, incluido cierre ordenado.

La primera entrega funcional queda completa en desarrollo local. Identidad y autorización siguen siendo la siguiente etapa; no se afirma preparación productiva. Las decisiones de campos/índice de ADR-002 se mantienen; su límite de alcance sin HTTP/web queda superado por esta entrega.
