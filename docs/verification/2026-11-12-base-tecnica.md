# Verificación de la base técnica

Fecha: 2026-11-12. Resultado: **base local verificada**. No representa certificación ni publicación de producción.

## Entorno y alcance

Node 26.13.1, pnpm 12.18.0, PostgreSQL 18.6 en Docker. Desarrollo en el proyecto Docker `asistencia`, puerto 55432; pruebas en contenedor independiente, puerto 55433. No se modificaron los contenedores de otros proyectos.

Se prepararon API, web, contratos, migración de infraestructura, herramientas, pruebas y documentación. No se implementaron Departamentos ni otros módulos de negocio.

## Resultados ejecutados

| Comprobación                            | Resultado                                                            |
| --------------------------------------- | -------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`        | Correcto; lockfile reproducible sin cambios                          |
| `pnpm lint`                             | ESLint y grafo sin infracciones: 51 módulos, 58 dependencias         |
| `pnpm format:check`                     | Correcto                                                             |
| `pnpm typecheck`                        | Correcto en API, web, contratos, configuración y E2E                 |
| `pnpm test`                             | 27 pruebas aprobadas, 4 archivos                                     |
| `pnpm test:integration`                 | 3 pruebas aprobadas con PostgreSQL real                              |
| `pnpm build`                            | Contratos, API y web compilados; sin advertencia de tamaño de chunks |
| `pnpm test:e2e`                         | 2 pruebas aprobadas: escritorio y móvil Chromium                     |
| `pnpm audit --prod`                     | 0 vulnerabilidades reportadas                                        |
| `pnpm db:migrate` dos veces             | Correcto, sin duplicar migraciones                                   |
| Migrador compilado                      | Correcto contra la base local                                        |
| API compilada con `NODE_ENV=production` | Liveness 200, readiness 200, OpenAPI 404                             |
| SIGTERM de la API compilada             | Cierre ordenado, código 0                                            |
| `pnpm dev`                              | Web 5173 y API 3001 disponibles; readiness 200                       |

Las pruebas de navegador verificaron conexión real web/API/PostgreSQL, logo cargado, locale `es-MX`, ausencia de desbordamiento horizontal y ausencia de errores JavaScript. Se inspeccionaron visualmente las capturas de escritorio y móvil guardadas en `test-results/` (artefactos ignorados por Git).

## Revisión y correcciones

Una revisión independiente detectó que una URL malformada podía lanzar una excepción de URL con credenciales fuera del error sanitizado. Una prueba de regresión reprodujo el fallo antes de la corrección; la validación usa ahora `URL.parse` y devuelve solo nombres de campos inválidos. La prueba verifica también la representación completa del error sin el secreto.

Se actualizó Swagger UI a 6.1.3 tras detectar vulnerabilidades transitivas en 5.2.6. Se comprobó su declaración de compatibilidad con Fastify 5 y su funcionamiento mediante tests. TypeScript 6.0.3 conserva compatibilidad con `typescript-eslint`; la selección está explicada en el ADR.

## Límites

- La prueba de readiness verifica conectividad PostgreSQL; las migraciones se aplican explícitamente con `pnpm db:migrate`.
- No hay autenticación, datos de empleados ni operaciones de negocio.
- El despliegue requiere reverse proxy, secretos propios y las verificaciones operativas de su etapa.
- La instalación informa dos dependencias transitivas obsoletas de Drizzle Kit. Playwright informa una advertencia de variables de color del terminal. Ninguna provocó fallos; la auditoría de producción quedó en cero.
- Git quedó inicializado en `setup/base-tecnica`; no se creó remoto, commit ni publicación.
