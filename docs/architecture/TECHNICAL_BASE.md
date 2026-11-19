# Base técnica

## Alcance autorizado

Preparar la etapa A del prompt maestro: monorepo pnpm, API Fastify, PostgreSQL con Drizzle, React con Vite, Tailwind y shadcn/ui; herramientas de calidad, pruebas y documentación. No implementar Departamentos, autenticación, asistencia, aprobaciones ni la aplicación móvil en esta entrega.

## Diseño

- `apps/api`: servidor ESM, configuración validada, logging estructurado y cierre ordenado. `/api/health/live` confirma el proceso; `/api/health/ready` consulta PostgreSQL y devuelve 503 si no está disponible. OpenAPI disponible en desarrollo.
- `apps/web`: pantalla mínima en español que consulta el estado real de la API usando TanStack Query. Sin métricas inventadas ni módulos simulados. Proxy `/api` en Vite; producción requiere reverse proxy del mismo origen.
- `packages/contracts`: contratos HTTP TypeBox compartidos, sin infraestructura.
- PostgreSQL exclusivo del proyecto en Docker Compose, con servicio separado y efímero para pruebas. Primera migración de infraestructura crea `app_meta`, sin tablas de negocio.
- Vitest para configuración, HTTP y UI. Integración explícita con PostgreSQL real y prueba de migración repetible. Playwright para comprobar navegador y comunicación web/API/BD.
- ESLint y revisión automática de dependencias para aislar el dominio y las interfaces públicas de futuros módulos.

## Decisiones de implementación

La documentación ya selecciona monolito modular, Fastify y Drizzle. No se consideran arquitecturas alternativas que contradigan esas decisiones. Se usará Node 26 LTS y versiones exactas verificadas en npm. TypeScript se limita a la última estable compatible con ESLint; los números originales de las especificaciones no sustituyen la consulta al registro.

No se crean paquetes ni módulos vacíos. Las reglas de negocio confirmadas se preservan en los documentos existentes. Las diferencias sobre biometría, precisión GPS y controles IP no bloquean esta etapa porque no se implementan marcajes.

## Verificación y límites

Lint, formato, typecheck, pruebas unitarias/UI, integración PostgreSQL, build y navegador deben ejecutarse. La base local no representa certificación de producción. La política de despliegue, autenticación, backups operativos y dominio/TLS corresponden a etapas posteriores.
