# ADR-001: Base técnica del monolito modular

Fecha: 2026-11-12. Estado: implementada para desarrollo local.

## Contexto y decisión

Sistema interno para una empresa de aproximadamente 30 empleados, mantenido por una persona. El usuario confirmó Fastify + Drizzle. Se sigue el monolito modular del prompt maestro, sin multitenancy ni microservicios.

La API usa Node ESM y TypeScript estricto; PostgreSQL es la fuente de verdad. El frontend usa React, Vite, Tailwind y componentes shadcn/ui copiados al repositorio. Los contratos HTTP TypeBox viven en `packages/contracts`; el dominio de futuros módulos no dependerá del framework ni de persistencia. Dependency Cruiser rechaza ciclos, acceso privado entre módulos y dependencias de infraestructura desde dominio.

## Versiones verificadas

Consulta al registro npm realizada el 2026-11-12. Versiones directas exactas y resolución transitiva conservada en `pnpm-lock.yaml`:

| Herramienta                         | Selección                 |
| ----------------------------------- | ------------------------- |
| Node / pnpm                         | 26.13.1 LTS / 12.18.0     |
| TypeScript                          | 6.0.3                     |
| Fastify / Drizzle ORM / Drizzle Kit | 5.12.8 / 0.45.4 / 0.31.11 |
| PostgreSQL                          | 18.6-alpine               |
| React / Vite                        | 19.3.1 / 8.3.8            |
| Tailwind / shadcn CLI               | 4.3.5 / 4.23.0            |
| TypeBox / proveedor Fastify         | 1.4.6 / 6.3.0             |
| Vitest / Playwright                 | 5.1.0 / 1.65.0            |
| ESLint / typescript-eslint          | 10.14.0 / 8.72.2          |

TypeScript 7.0.2 era la última estable consultada, pero `typescript-eslint` declara compatibilidad `<6.1.0`. Se seleccionó 6.0.3 para respetar el conjunto de herramientas. No se ocultaron incompatibilidades de peers. Se usa el paquete actual `typebox` requerido por el proveedor Fastify 6, en lugar del paquete anterior `@sinclair/typebox`.

Swagger UI 6.1.3 declara `fastify: '5.x'` en su metadata de plugin y se verifica mediante pruebas de arranque. Se descartó 5.2.6 tras detectar vulnerabilidades en sus dependencias transitivas. El ejemplo de compatibilidad del README de npm no reflejaba la versión más reciente.

## Consecuencias

Se crean solo paquetes usados: API, web y contratos. No hay aplicación móvil ni módulos vacíos. La migración inicial prepara `app_meta` sin inventar entidades comerciales. La base de pruebas es un contenedor independiente y efímero. La web muestra únicamente estado real, sin métricas o funcionalidades simuladas.

Configuración, autenticación de negocio, reglas laborales, recuperación de backups y despliegue productivo se incorporarán en sus etapas. Los módulos futuros deberán respetar las reglas confirmadas de las especificaciones.

## Fuentes de herramientas

- [Node: versiones y soporte](https://nodejs.org/en/about/previous-releases)
- [shadcn/ui con Vite](https://ui.shadcn.com/docs/installation/vite)
- [Configuración de pnpm](https://pnpm.io/settings)
- Metadata `version`, `engines` y `peerDependencies` consultada mediante `npm view`.
