# Verificación: primera entrega, puntos 4–7

Fecha: 2026-11-12. Resultado: **primera funcionalidad vertical de Departamentos completa en desarrollo local**.

## Entrega

- API Fastify de creación/listado con casos de uso, validación estricta, normalización y manejo de errores.
- Pantalla React `/departamentos`, formulario accesible, listado real y estados de carga, vacío, fallo/reintento, guardando, duplicado y éxito.
- Flujo React → HTTP → caso de uso → Drizzle → PostgreSQL → respuesta → React.
- Documentación actualizada: README, desarrollo, guía, modelo de datos, API, ADR y estado de fases.

Se mantuvieron la tabla y las dos migraciones existentes. No se implementó edición/eliminación, autenticación ni otros módulos.

## Resultados ejecutados

| Verificación                      | Resultado                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`  | Correcto, resolución reproducible                                                         |
| `pnpm lint`                       | Correcto; 88 módulos y 137 dependencias sin infracciones                                  |
| `pnpm format:check`               | Correcto                                                                                  |
| `pnpm typecheck`                  | Correcto en API, web, contratos y herramientas/E2E                                        |
| `pnpm test`                       | 64 pruebas aprobadas, 9 archivos                                                          |
| `pnpm test:integration`           | 40 pruebas aprobadas, 3 archivos, PostgreSQL real                                         |
| `pnpm test:e2e`                   | 6 pruebas aprobadas, escritorio y móvil                                                   |
| `pnpm build`                      | Contratos, API y web compilados                                                           |
| `pnpm audit --prod`               | Cero vulnerabilidades reportadas                                                          |
| API compilada en proceso separado | POST 201, GET 200, duplicado 409, PostgreSQL confirmado, documentación 404 con producción |
| SIGTERM de API compilada          | Cierre ordenado, código 0                                                                 |
| `pnpm db:migrate`                 | Correcto; continúan las 2 migraciones, sin cambio de esquema                              |
| Desarrollo local                  | `/departamentos` HTTP 200; API de listado 200; PostgreSQL saludable                       |

Total: **110 pruebas aprobadas**. La integración HTTP usa una base temporal propia en el servidor `_test`. La prueba compilada también creó y eliminó únicamente su base temporal. Desarrollo conserva cero departamentos precargados.

## Casos comprobados

HTTP: lista vacía, creación confirmada, serialización ISO UTC, lectura persistente, nombre duplicado, conflicto concurrente, datos inválidos, campos adicionales, tipos numéricos/booleanos rechazados, JSON malformado, contenido no admitido, OpenAPI y errores de conexión sin secretos/SQL.

Formulario: carga, vacío, lectura de datos, fallo/reintento, blancos, límite por puntos de código, Unicode NFC/NFD, carácter nulo, creación y actualización del listado, bloqueo pendiente, duplicado conservando texto y ausencia de retry automático de POST.

Navegador real: navega desde Inicio a Departamentos, rechaza vacío, envía formulario, recibe 201, comprueba la fila directamente en PostgreSQL, recarga y conserva el registro, confirma 409 al repetir nombre y comprueba que no hay duplicados. Verifica navegación activa, ausencia de errores JavaScript y de desbordamiento horizontal. Limpia solo los IDs creados por cada prueba.

Se inspeccionaron las capturas de escritorio y móvil en `test-results/`. El formulario aparece antes de la lista en móvil y al lado en escritorio. No se usaron mocks en el flujo E2E.

## Revisión y límites

La revisión independiente no encontró hallazgos P1/P2 en este alcance. Todas las verificaciones del coordinador terminaron correctamente. Las advertencias de color de terminal en Playwright y las dos dependencias transitivas obsoletas de Drizzle Kit no provocaron fallos.

La interfaz muestra fecha de creación en `es-MX` y `America/Merida`; la API devuelve UTC. La ausencia de confirmación de creación se trata conservando el nombre y permitiendo actualizar la lista antes de intentar de nuevo.

Esta entrega es local, sin autenticación. Identidad y autorización siguen como siguiente etapa (punto 8). No se iniciaron automáticamente ni se hicieron staging, commits, push, despliegue o publicación.
