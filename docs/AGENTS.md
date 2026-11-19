# Repository Guidelines

## Project Structure & Module Organization

Paths are relative to the repository root. Read `docs/PROMPT MAESTRO PARA CODEX.md`, `docs/POLÍTICA OBLIGATORIA DE VERSIONES TECNOLÓGICAS.md`, and `docs/arquitectura_y_ regla_de_negocio.md`. The historical `.funciones_asistenciamd` remains at the root; confirmed decisions in `docs/` supersede its conflicting stack references.

- `apps/api/src/bootstrap/`: configuration and Fastify composition.
- `apps/api/src/infrastructure/database/`, `apps/api/drizzle/`: Drizzle connection, schema, and migrations.
- `apps/api/src/modules/identity/`, `employees/`: sessions, scoped access, employee records and organizational responsibilities.
- `apps/api/src/modules/dashboard/`: consultas autenticadas, diagnóstico ADMIN/HR y composición de resúmenes; sin efectos de negocio.
- `apps/api/src/modules/audit/`, `planning/`, `locations/`, `attendance/`, `requests/`: transactional audit/outbox, versioned schedules, and scoped geofencing.
- `apps/api/tests/`: configuration, HTTP, architecture, and PostgreSQL tests.
- `apps/web/src/`: application providers, features, and shadcn/ui components.
- `packages/contracts/src/`: shared TypeBox HTTP contracts.
- `assets/`: existing branding; `infra/compose.yaml`: isolated development/test PostgreSQL.
- `tests/e2e/`: Playwright; `docs/DEVELOPMENT.md`: setup and commands.

The first module is `apps/api/src/modules/departments/`: domain, application use cases, private Drizzle/HTTP adapters, and public `index.ts`. Its GET/POST contract is documented in `docs/api/DEPARTMENTS.md`. Shared department contracts are in `packages/contracts/src/departments.ts`. Web routing uses TanStack Router in `apps/web/src/app/router.ts`; pages are in `apps/web/src/pages/`. Mobile and unused packages are not scaffolded.

## Build, Test, and Development Commands

Use Node 26.13.1 and pnpm 12.18.0. Install with `pnpm install --frozen-lockfile`; create `.env` from `.env.example` if absent.

- `pnpm db:up`, `pnpm db:migrate`, `pnpm dev`: start database, apply migrations, run API/web.
- `pnpm check`: lint, format, strict types, unit/UI tests, and build.
- `pnpm db:test:up`, `pnpm test:integration`: PostgreSQL integration tests.
- `pnpm test:e2e`: desktop/mobile Chromium checks; install Chromium first.
- `pnpm db:generate`: generate migrations for review.
- `pnpm admin:create` / `pnpm admin:recovery`: secure initial access/recovery CLI.

Verify stable versions and compatibility before installation. Pin dependencies and preserve `pnpm-lock.yaml`. Document compatibility exceptions in `docs/adr/`.

## Architecture & Coding Style

Use a single-company modular monolith with Fastify and Drizzle. Keep domain independent of HTTP/persistence. Import other modules only through public `index.ts` services or `schema.ts` persistence contracts; prohibit cycles and private repository access. `pnpm check:boundaries` enforces dependency rules.

Use strict TypeScript, two-space indentation, ESLint, and Prettier. Components use PascalCase; functions use camelCase. Avoid unjustified `any`, controller business logic, and unnecessary abstractions. User-facing messages use `es-MX`.

## Testing Guidelines

Use Vitest with `*.test.ts`/`*.test.tsx`; PostgreSQL tests use `*.integration.test.ts`. Integration requires `TEST_DATABASE_URL` ending in `_test`, never development credentials as fallback. No coverage percentage is prescribed. Test new rules, authorization, idempotency, and overnight boundaries. Report executed checks and exact limitations.

## Business & Security Constraints

Administration and IT are on site; administrative defaults are Monday–Friday 08:00–17:00. Operational staff work from home in configurable 08:00–16:00, 16:00–00:00, and 00:00–08:00 shifts, including weekends and holiday duties. Both modalities require entry/exit; on-site requires geolocation. New requests use definitive department-head approval (HEAD_ONLY), as confirmed by the user on 2026-11-17. Historical requests retain their frozen HEAD_DIRECTOR flow. Attendance punches, scoped history, incidents and append-only reasons are implemented (step 13). Requests, versioned approval flows, vacation ledger, permissions, justifications and private evidence are implemented (steps 14–15); a reason alone never approves an incident. Revalidate authority in transactions and preserve original attendance events. Planning, on-demand geofence validation and internal notifications are implemented (steps 10–12). Preserve published snapshots and original validation results. Default worksite radius is 10 m; maximum GPS accuracy starts at configurable 10 m. Home office must not require or store GPS. Departments and employees support CRUD in the API and web. Deletion requires ADMIN/HR and CSRF. Reject deletion of departments with employee/assignment references or employees with assignment/subordinate references; preserve history and disable linked employee accounts transactionally. Identity, scoped access, employees and organizational assignments are implemented; see `docs/api/IDENTITY_EMPLOYEES.md`. Never add default credentials or bypass authentication in tests.

Keep secrets/personnel data out of commits/logs. Enforce server-side authorization, retain original events and audit trails, and store instants in UTC with IANA context.

Hourly permissions confirmed 2026-11-18: Entrada tardía and Salida anticipada require at least 24 elapsed hours before absence starts, an explicit hourly interval and a reason; no receipt is mandatory. Initial pay is paid leave (`paid:true`), editable by authorized management for future requests. Preserve snapshots and old idempotency responses. `minimumNoticeHours` and `partialOnly` are per-type settings; do not impose the administrative 17:00 end on all schedules. LFT policy is already published; do not infer unused historical vacation balances.

Confirmed 2026-11-18: official Mexico 2026–2027 holidays only in the shipped preset (LFT art. 74 plus INE ordinary federal election 2027-06-06); load with audited `pnpm holidays:sync`, requiring a live SUPER_ADMIN. Never extrapolate electoral holidays to unverified years. Administrative entry at 30 minutes after shift start (08:30 for 08:00) is accepted with `LATE_ABSENCE`, subject to existing GPS/window checks. It can be justified through HEAD_ONLY; a reason alone does not approve it. `administrativeAbsenceMinutes` is nullable and versioned, and applies to the category frozen in the shift, preserving old controls and operational shifts.

## Commit & Pull Request Guidelines

Use imperative commit subjects. PRs describe scope, linked issues, migrations, checks, limitations, and screenshots for UI changes. Preserve unrelated work; complete only the requested stage.

## Dashboard y configuración

El dashboard consulta por alcance vigente y hora/fecha del servidor. No deducir faltas por falta de marcaje; solo evaluaciones persistidas. Conservar nocturnos y ventanas de salida según política congelada. Motivo no equivale a resolución. Las incidencias/solicitudes pendientes abarcan todo el historial autorizado; el resumen diario usa fecha civil de inicio. No revelar razones privadas, archivos o GPS en indicadores. Los diagnósticos son de lectura, no configuración automática ni certificación de producción. Ver `docs/api/DASHBOARD.md`.
