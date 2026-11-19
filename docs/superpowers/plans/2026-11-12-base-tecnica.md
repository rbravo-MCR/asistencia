# Base técnica Implementation Plan

> **For agentic workers:** usar superpowers:executing-plans para ejecutar por tareas y verificar cada resultado.

**Goal:** entregar la etapa A ejecutable sin módulos de negocio.
**Architecture:** monorepo pnpm; API modular Fastify y web React, contratos compartidos y PostgreSQL aislado.
**Tech Stack:** Node LTS, TypeScript strict, Drizzle, PostgreSQL, Vite, Tailwind, shadcn/ui, Vitest.
**Spec:** `docs/architecture/TECHNICAL_BASE.md`; alcance de etapa A en `docs/PROMPT MAESTRO PARA CODEX.md`.

## Global Constraints

- Fastify + Drizzle; sin Prisma ni Express.
- Versiones estables exactas y lockfile. Sin microservicios, multitenancy ni módulos de negocio.
- No tocar contenedores o bases de otros proyectos.
- Mensajes de interfaz en español y fechas en es-MX.

## Review Focus

- Configuración ausente, puertos inválidos y URLs malformadas deben impedir el arranque.
- Caída de PostgreSQL debe producir readiness 503 sin exponer secretos.
- Migraciones repetidas deben funcionar y no perder datos.
- UI debe mostrar carga, disponibilidad y fallo real, sin datos ficticios.
- Importaciones privadas entre módulos, ciclos y dependencias de infraestructura en dominio deben rechazarse.

### Task 1: Workspace y herramientas

Archivos: raíz `package.json`, `pnpm-workspace.yaml`, TypeScript/ESLint/Prettier, `packages/contracts`, `infra/compose.yaml`, `.env.example`.

- [x] Consultar npm y registrar versiones, engines y compatibilidad.
- [x] Configurar paquetes ESM y scripts, aislamiento de Docker y exclusiones de secretos.
- [x] Instalar dependencias exactas con lockfile y verificar instalación reproducible.

### Task 2: API y PostgreSQL

Archivos: `apps/api/src/bootstrap/`, `apps/api/src/infrastructure/database/`, `apps/api/tests/`, migraciones Drizzle.
Interfaces: `parseConfig(env)`, `buildApp(config)`, `createDatabase(url)`; contratos HTTP desde `@asistencia/contracts`.

- [x] Escribir pruebas para configuración, liveness/readiness, errores y OpenAPI; observar fallos.
- [x] Implementar configuración, servidor, lifecycle y conexión Drizzle.
- [x] Agregar migración `app_meta`, verificar integración PostgreSQL y aplicación repetida.
- [x] Confirmar pruebas de API y persistencia reales.

### Task 3: Web y límites modulares

Archivos: `apps/web/src/`, configuración Vite, componentes shadcn/ui, reglas de dependencias.
Interfaces: HTTP GET `/api/health/ready` y `ReadinessSchema` de contratos.

- [x] Escribir pruebas de carga/disponibilidad/error y observar fallo antes de implementar.
- [x] Implementar pantalla de estado, providers y estilos responsivos usando el logo existente.
- [x] Establecer restricciones de dependencias y probar sus casos de violación.
- [x] Verificar pruebas UI, lint y build.

### Task 4: Verificación y documentación

Archivos: `docs/DEVELOPMENT.md`, `docs/adr/ADR-001-ARCHITECTURE.md`, `docs/AGENTS.md`, `README.md`, pruebas Playwright y evidencia.

- [x] Ejecutar lint, formato, typecheck, tests, integración, build y navegador.
- [x] Comprobar arranque de API compilada y migraciones repetibles en PostgreSQL real.
- [x] Revisar el resultado y corregir fallos relacionados con esta etapa.
- [x] Documentar comandos exactos, versiones, resultados y límites.

## Registro

- Alcance: el usuario autoriza preparar la base técnica ya especificada; se ejecuta sin nueva ronda de aprobación.
- Git no estaba inicializado al comenzar. No hay commits previos ni trabajo de código que aislar en otro worktree.

## Cierre

Todas las tareas completadas. Evidencia: `docs/verification/2026-11-12-base-tecnica.md`.
Revisión independiente realizada; hallazgo de URL malformada corregido con regresión RED→GREEN. Resultado final: 27 pruebas unitarias/UI/arquitectura, 3 integraciones PostgreSQL y 2 E2E aprobadas. No se hicieron commits ni publicación.
