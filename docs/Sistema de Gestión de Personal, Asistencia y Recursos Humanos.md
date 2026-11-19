# Sistema de Gestión de Personal, Asistencia y Recursos Humanos

> Actualización confirmada por el usuario el 17-11-2026: la aprobación de jefatura es definitiva para permisos laborales nuevos (HEAD_ONLY). Esta decisión sustituye las exigencias anteriores de visto bueno de dirección en este documento. Se conserva el flujo HEAD_DIRECTOR únicamente en solicitudes históricas. La administración de accesos de usuarios permanece separada. Ver `docs/api/REQUESTS.md`.

## 1. ROL Y RESPONSABILIDAD

Actúa como un equipo experto integrado por:

- Arquitecto de software senior.

- Ingeniero backend senior especializado en Node.js, TypeScript y Fastify.

- Ingeniero frontend senior especializado en React, TypeScript, shadcn/ui y Tailwind CSS.

- Ingeniero móvil especializado en React Native y Expo.

- Arquitecto de bases de datos PostgreSQL.

- Especialista en seguridad, observabilidad y calidad.

- Diseñador UX/UI senior especializado en sistemas empresariales.

Eres responsable de diseñar e implementar un sistema profesional, seguro, modular, mantenible y preparado para producción.

**El proyecto será desarrollado y mantenido por una sola persona.**

Por tanto, debes priorizar:

1. Simplicidad operativa.

2. Arquitectura modular real.

3. Código entendible y mantenible.

4. Reutilización responsable.

5. Bajo acoplamiento.

6. Alta cohesión.

7. Seguridad.

8. Trazabilidad y auditoría.

9. Pruebas automatizadas.

10. Rendimiento adecuado a la carga real.

No implementes complejidad empresarial innecesaria.

No debes intentar terminar todo el sistema en una sola ejecución.

---

## 2. CONTEXTO DEL NEGOCIO

Desarrollaremos un sistema interno de gestión de personal, control de asistencia, vacaciones, permisos, justificaciones y planificación de turnos.

### Escala inicial

- 30 empleados aproximadamente.

- Una empresa.

- Varios departamentos.

- Un jefe responsable por departamento, con posibilidad de suplencias autorizadas.

- Un área de Recursos Humanos.

- Empleados administrativos y operativos.

- Aplicación móvil para empleados.

- Panel web para administración y responsables.

**No es un SaaS multitenant.**

No implementar multitenancy, microservicios ni infraestructura distribuida innecesaria.

La arquitectura debe permitir crecimiento futuro sin sobredimensionar la solución actual.

### Categorías laborales

**Administrativos**

- Horarios fijos.

- Configuración de jornada semanal.

- Días de descanso.

- Políticas de asistencia correspondientes.

**Operativos**

- Horarios asignados mediante calendario.

- Modalidad presencial o home office definida por cada turno.

- Posibilidad de alternar modalidades durante la semana.

- Guardias cuando corresponda.

- Cambios de turno autorizados.

La modalidad de trabajo no es una propiedad permanente del empleado.

Cada asignación de turno determina la modalidad aplicable.

Una guardia puede ser presencial o remota. No modelar guardia como una tercera modalidad incompatible con las anteriores.

---

## 3. STACK TECNOLÓGICO

### Backend

- Node.js LTS vigente y compatible.

- TypeScript en modo strict.

- Fastify.

- PostgreSQL.

- Drizzle ORM.

- SQL explícito cuando sea técnicamente conveniente.

- TypeBox + JSON Schema para contratos y validación HTTP.

- OpenAPI.

- Pino para logging estructurado.

- Vitest para pruebas.

- OpenTelemetry cuando exista una necesidad concreta de instrumentación.

### Frontend administrativo

- React.

- TypeScript.

- Vite.

- shadcn/ui.

- Tailwind CSS.

- TanStack Query.

- TanStack Table.

- React Hook Form.

- Zod para validación de formularios.

- Librería especializada de drag & drop cuando se implemente el calendario.

- Lucide React.

### Aplicación móvil

- React Native.

- Expo.

- TypeScript.

- Autenticación segura.

- Geolocalización bajo demanda.

- Almacenamiento local protegido.

- Diseño preparado para sincronización de marcajes offline.

Verificar la compatibilidad de las capacidades nativas antes de implementarlas.

No asumir que Expo Go soporta todas las funciones de producción.

### Herramientas

- pnpm Workspaces.

- ESLint.

- Prettier.

- Docker Compose para desarrollo local.

- Migraciones versionadas.

- Variables de entorno validadas.

- Git.

**No inventar números de versión.**

Antes de instalar dependencias, verificar sus versiones estables, compatibilidad y mantenimiento.

Evitar dependencias obsoletas o innecesarias.

---

## 4. ARQUITECTURA OBLIGATORIA

Implementar un **MONOLITO MODULAR** con arquitectura hexagonal pragmática.

Principios obligatorios:

- SOLID.

- DRY.

- KISS.

- Separación de responsabilidades.

- Alta cohesión.

- Bajo acoplamiento.

- Inversión de dependencias.

- Composición sobre herencia cuando sea apropiado.

- Validación en los límites del sistema.

- Seguridad por diseño.

- Idempotencia.

- Trazabilidad.

- Auditoría.

- Transacciones explícitas.

### Reglas de modularidad

Cada módulo debe:

1. Tener una responsabilidad definida.

2. Controlar sus reglas de negocio.

3. Publicar contratos explícitos.

4. Ocultar detalles internos.

5. Poder probarse independientemente.

6. Evitar dependencias circulares.

7. No acceder directamente a repositorios privados de otros módulos.

8. No depender directamente del framework HTTP en su dominio.

9. Mantener la persistencia desacoplada de los casos de uso cuando aporte una ventaja real.

10. Tener una interfaz pública mínima.

No crear interfaces, repositorios o clases abstractas sin justificación.

No utilizar un patrón genérico de repositorio que impida aprovechar PostgreSQL correctamente.

No crear un paquete `shared` gigante que termine concentrando todas las dependencias.

Los módulos deben funcionar como piezas LEGO mediante contratos claros, sin exigir que todos tengan exactamente la misma estructura interna.

### Estructura inicial de referencia

```
hr-system/├── apps/│   ├── api/│   │   ├── src/│   │   │   ├── bootstrap/│   │   │   ├── modules/│   │   │   ├── infrastructure/│   │   │   └── main.ts│   │   └── tests/│   ├── web/│   │   └── src/│   │       ├── app/│   │       ├── features/│   │       ├── components/│   │       │   └── ui/│   │       └── lib/│   └── mobile/│       └── src/│           ├── app/│           ├── features/│           └── components/├── packages/│   ├── contracts/│   ├── design-tokens/│   └── tooling/├── infra/├── docs/│   ├── architecture/│   └── adr/├── AGENTS.md├── pnpm-workspace.yaml└── package.json
```

Es una estructura de referencia, no una obligación de crear carpetas vacías.

Ajustarla únicamente cuando exista justificación arquitectónica.

---

## 5. MÓDULOS DEL SISTEMA

Los módulos de negocio previstos son:

### 5.1 Identidad y autorización

- Usuarios.

- Autenticación.

- Roles y permisos.

- Sesiones.

- Recuperación de acceso.

- Asignación de responsables.

- Delegaciones autorizadas.

No confundir roles globales con alcance organizacional.

### 5.2 Empleados

- Expediente básico.

- Número interno de empleado.

- Departamento.

- Puesto.

- Fecha de ingreso.

- Categoría administrativa u operativa.

- Estado laboral.

- Superior responsable.

### 5.3 Departamentos

- Departamentos.

- Jefes responsables.

- Asignaciones históricas.

- Suplentes autorizados.

- Relaciones jerárquicas necesarias.

### 5.4 Planificación de turnos

- Plantillas de turnos.

- Horarios fijos.

- Horarios variables.

- Guardias.

- Descansos.

- Asignación presencial/home office.

- Calendario visual.

- Detección de conflictos.

- Historial de modificaciones.

Las asignaciones publicadas deben versionarse o conservar evidencia suficiente para reconstruir su estado histórico.

### 5.5 Asistencia

- Entrada.

- Salida.

- Marcajes originales.

- Evaluación contra turnos.

- Retardos.

- Faltas.

- Salidas anticipadas.

- Marcajes omitidos.

- Tolerancias configurables.

- Incidencias.

Separar marcaje, evaluación e incidencia.

Los eventos originales no deben sobrescribirse para corregir resultados.

### 5.6 Ubicaciones

- Centros de trabajo.

- Coordenadas.

- Geocercas.

- Precisión GPS.

- Políticas por modalidad.

- Excepciones de ubicación.

El GPS no es prueba absoluta de presencia.

Cuando su precisión sea insuficiente, generar una excepción o permitir revisión.

No exigir geolocalización permanente ni monitoreo continuo.

No asumir geocerca obligatoria en domicilios particulares.

### 5.7 Vacaciones

- Políticas.

- Antigüedad.

- Periodos.

- Saldos.

- Solicitudes.

- Aprobaciones.

- Cancelaciones.

- Movimientos y ajustes auditables.

La política debe contemplar la legislación laboral mexicana y los beneficios internos de la empresa.

No codificar valores legales dispersos en controladores o componentes.

### 5.8 Permisos

- Catálogo de tipos de permiso.

- Permisos con goce.

- Permisos sin goce.

- Entradas tardías autorizadas.

- Salidas anticipadas.

- Emergencias.

- Periodos parciales.

- Evidencias cuando corresponda.

### 5.9 Justificaciones

- Justificación de faltas.

- Retardos.

- Omisión de marcaje.

- Salida anticipada no autorizada previamente.

- Documentación.

- Resolución de incidencias.

Toda justificación debe conservar la incidencia y el marcaje original relacionado.

### 5.10 Aprobaciones

- Solicitudes pendientes.

- Identificación del aprobador.

- Aprobación.

- Rechazo.

- Motivos.

- Delegación.

- Historial.

- Políticas versionadas.

### 5.11 Auditoría

- Actor.

- Acción.

- Entidad afectada.

- Fecha y hora.

- Cambio realizado.

- Motivo.

- Correlation ID.

- Evidencia de autorización.

Evitar registrar información sensible innecesaria en logs.

### 5.12 Notificaciones

- Notificaciones internas.

- Avisos de solicitudes.

- Resultado d
