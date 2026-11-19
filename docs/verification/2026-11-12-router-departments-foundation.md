# Verificación: primera entrega, puntos 1–3

Fecha: 2026-11-12. Resultado: **alcance local completado y verificado**.

## Resultado entregado

1. TanStack Router 1.170.46 con rutas `/` y `/estado`, layout común, enlaces activos, acceso directo, navegación/retroceso y página 404 con regreso al inicio.
2. Dominio de Departamentos con UUID, nombre y fecha de creación; validación NFC/trim y límite de 100 puntos de código, errores de nombre inválido/duplicado y contratos TypeBox de creación/salida/listado.
3. Tabla PostgreSQL `departments`, repositorio Drizzle, checks de longitud/canonización e índice único de nombre normalizado. Migración `0001_departments.sql`, sin cambios en la migración anterior y sin datos semilla.

No se implementaron endpoints ni pantalla CRUD de Departamentos, autenticación o módulos adicionales.

## Verificaciones ejecutadas

| Comando o comprobación                      | Resultado                                                           |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`            | Correcto; sin cambios en resolución                                 |
| `pnpm lint`                                 | Correcto; 68 módulos y 88 dependencias sin infracciones             |
| `pnpm format:check`                         | Correcto                                                            |
| `pnpm typecheck`                            | Correcto en API, web, contratos y herramientas                      |
| `pnpm test`                                 | 50 pruebas aprobadas en 7 archivos                                  |
| `pnpm test:integration`                     | 20 pruebas aprobadas con PostgreSQL real                            |
| `pnpm test:e2e`                             | 4 pruebas aprobadas: escritorio y móvil                             |
| `pnpm build`                                | Contratos, API y web compilados                                     |
| `pnpm audit --prod`                         | Cero vulnerabilidades reportadas                                    |
| `pnpm db:migrate` dos veces en desarrollo   | Correcto; historial de 2 migraciones, tabla de 3 columnas y 0 filas |
| `pnpm --filter @asistencia/api db:generate` | Sin diferencias de esquema pendientes                               |
| Web `/estado` y readiness local             | HTTP 200                                                            |

Las integraciones comprobaron creación y lectura persistente, Unicode NFC, espacios externos, duplicados por capitalización, conflictos concurrentes, restricciones SQL directas, aplicación desde una base temporal vacía y conservación de datos al repetir migraciones. Las pruebas limpian únicamente sus filas y eliminan su base temporal propia, en el servidor de pruebas.

Las pruebas de navegador comprobaron navegación y retroceso, recarga de ruta interna, recuperación desde 404, logo cargado, ausencia de errores JavaScript y ausencia de desbordamiento horizontal. Se inspeccionaron capturas de escritorio y móvil en `test-results/`, ignoradas por Git.

## Revisión independiente

Se detectaron y corrigieron dos diferencias con pruebas RED→GREEN:

- El límite bruto de entrada rechazaba nombres que cumplían el límite después de NFC/trim. El contrato de entrada valida forma y caracteres; el dominio limita el resultado normalizado. La salida conserva el límite de 100. Se probó también el recorrido completo de una entrada NFD de 100 caracteres normalizados en PostgreSQL.
- U+0000 era aceptado por la validación aunque PostgreSQL no lo almacena en text. Se rechaza ahora tanto en dominio como en contratos, antes del acceso a la base.

No se modificó la migración tras estas correcciones, ya que PostgreSQL ya rechaza por sí mismo U+0000.

## Límites y continuación

El futuro endpoint debe aplicar las validaciones de contrato y dominio, serializar `createdAt` a ISO UTC y mapear errores a HTTP. No se añaden códigos, descripción, estados ni relaciones organizacionales sin requisitos adicionales.

La SPA requiere fallback a `index.html` para rutas web y proxy separado de `/api` en producción. El 404 es una pantalla cliente, no una respuesta SSR. La prueba desde base vacía requiere `CREATEDB`, disponible en el contenedor dedicado de pruebas.

Se preservaron los documentos existentes, incluido `docs/Fases de la implementacion de Sistema de vacaciones.md`. No se hicieron staging, commits, push ni publicación. Continúan pendientes los puntos 4 y 5: API y pantalla de Departamentos.
