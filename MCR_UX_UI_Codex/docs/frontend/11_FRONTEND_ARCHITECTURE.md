# Arquitectura frontend y reglas de implementación

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Base inspeccionada

Monorepo pnpm; `apps/web` React 19.3.1, TanStack Router 1.170.46, Query 5.107.1, Vite 8.3.8, Tailwind 4.3.5, shadcn CLI 4.23.0, Radix, CVA, RHF, Zod y Lucide. Versiones son las declaradas en el ZIP, no verificación de últimas versiones ni instalación. API Fastify + Drizzle/PostgreSQL; TypeBox en `packages/contracts`. Node/pnpm según `.nvmrc` y `package.json`. Mantener lockfile.

## Evolución propuesta (sin reestructuración masiva)

```text
apps/web/src/
  app/                 # providers, router, root-layout
  components/
    ui/                # primitivas actuales
    patterns/          # patrones reutilizables nuevos cuando se necesiten
    layout/            # shell, sidebar, header
  features/            # conservar módulos actuales
    identity/ departments/ employees/ attendance/
    planning/ requests/ dashboard/ configuration/
    locations/ notifications/ audit/ system/
  lib/                 # API, utilidades, rangos
  pages/               # adaptadores de rutas
  styles.css           # entrada de tokens
```

Añadir `design-system/` solo si tamaño justifica separación; no duplicar `components/ui`. SRP, SOLID, DRY, KISS, cohesión y bajo acoplamiento. No usar patrones de backend artificialmente en UI. Feature posee orquestación; componentes puros presentan. Dependencias dirección app/pages→features→primitivas/lib; sin ciclos ni importación privada cruzada. Revisar `.dependency-cruiser.cjs` antes de cambiar carpetas y mantener `pnpm check:boundaries`.

## Estado y contratos

TanStack Query para servidor; estado local React para UI; URL para filtros compartibles donde router los admite. RHF/Zod para UX, TypeBox/API autoridad; no duplicar reglas críticas. `lib/api.ts`, sesión y mutaciones existentes son puntos de integración; mantener CSRF y manejo de errores. No añadir Redux ni cliente HTTP paralelo. Rutas `/asistencia`, `/incidencias`, `/calendario` conservan from/to inclusivos de máximo 93 días y fallback actual.

## Adopción incremental

Primero cambiar tokens y layout; probar rutas existentes. Después extraer patrones al identificar repetición real. Cada PR/fase pequeña con diff y pruebas. No alterar archivos backend/contracts, migraciones ni `.env` por rediseño sin aprobación expresa. No instalar Motion, dnd-kit, Recharts o TanStack Table automáticamente: no se declaran en dependencias del ZIP y drag & drop ya existe.

## Gate

TS estricto, sin `any` injustificado, sin supresiones para pasar build. `pnpm check`; revisar dependencias y lockfile. Documentar decisiones y excepciones en ADR conforme a AGENTS.
