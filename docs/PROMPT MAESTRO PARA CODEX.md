# PROMPT MAESTRO PARA CODEX

> Actualización confirmada por el usuario el 17-11-2026: la aprobación de jefatura es definitiva para permisos laborales nuevos (HEAD_ONLY). Esta decisión sustituye las exigencias anteriores de visto bueno de dirección en este documento. Se conserva el flujo HEAD_DIRECTOR únicamente en solicitudes históricas. La administración de accesos de usuarios permanece separada. Ver `docs/api/REQUESTS.md`.

# Sistema de Gestión de Personal, Asistencia y Recursos Humanos

> Confirmado el 18-11-2026: calendario entregado exclusivamente oficial LFT/INE para 2026–2027. En administrativos, desde 30 minutos después del inicio de jornada (08:30 para inicio08:00) se acepta el marcaje válido con falta justificable, con hora original conservada y decisión de jefatura; no se aplica corte universal a operativos. Política v2 configurable, controles históricos conservados. Ver `docs/verification/2026-11-18-official-holidays-attendance.md`.

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

- Administración e Informática trabajan de forma presencial.

- Jornada inicial de lunes a viernes, de 08:00 a 17:00.

- Horas de inicio y fin, días laborables y descansos configurables.

- Políticas de asistencia correspondientes a la jornada configurada.

**Operativos**

- Trabajo en home office.

- Tres turnos configurables, asignados mediante calendario.

- Cobertura de fines de semana y guardias en días festivos.

- Cambios de turno autorizados.

- Horarios iniciales: turno 1 de 08:00 a 16:00; turno 2 de 16:00 a 00:00 del día siguiente; turno 3 de 00:00 a 08:00. Todos son configurables. Conservar la fecha de inicio y fin de cada asignación; no asumir una rotación específica entre empleados.

Todos los horarios deben ser configurables. La jornada administrativa inicial no debe convertirse en una constante universal. Evaluar entradas y salidas contra la jornada o el turno asignado, incluidos los que cruzan medianoche.

Cada asignación conserva la modalidad aplicable; para el personal operativo es home office. No introducir alternancia presencial para operativos sin una nueva definición de negocio.

Una guardia es una asignación de trabajo, no una tercera modalidad. Las guardias del personal operativo son en home office.

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

- Jornadas administrativas configurables; valor inicial de lunes a viernes, de 08:00 a 17:00.

- Tres turnos operativos configurables en home office, con cobertura de fines de semana y guardias en días festivos.

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

La geolocalización es obligatoria en cada marcaje presencial, tanto de entrada como de salida, y se valida en el backend contra la ubicación autorizada. En home office es obligatorio registrar entrada y salida de cada turno asignado, sin geolocalización obligatoria. Ambos marcajes se evalúan contra el horario configurado del turno.

El GPS no es prueba absoluta de presencia.

Si falta la geolocalización o su precisión es insuficiente, no considerar validado el marcaje presencial; conservar el intento como excepción para revisión. El radio y la precisión aceptables quedan pendientes de definir.

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

- Identificación del jefe de departamento y del director responsable del visto bueno.

- Estados separados para autorización del jefe y visto bueno del director.

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

- Resultado de aprobaciones.

- Avisos a Recursos Humanos.

- Notificaciones móviles en una etapa posterior.

No introducir una plataforma de mensajería distribuida para el MVP.

---

## 6. REGLA FUNDAMENTAL DE APROBACIONES

**El jefe de departamento autoriza o rechaza las solicitudes de los empleados de su departamento. Las solicitudes autorizadas requieren el visto bueno del director para completar la aprobación.**

Recursos Humanos debe ser informado automáticamente de las resoluciones.

RR. HH. no es un segundo aprobador ordinario.

### Proceso general

1. El empleado crea una solicitud.

2. El backend valida sus datos y reglas e identifica al jefe autorizado.

3. La solicitud queda pendiente de autorización del jefe de departamento.

4. El jefe autoriza o rechaza; la decisión se registra de manera transaccional.

5. Si el jefe autoriza, la solicitud queda pendiente del visto bueno del director.

6. El director otorga o rechaza el visto bueno; se registra su decisión por separado.

7. Solo con autorización del jefe y visto bueno del director, el módulo aplica los efectos de negocio de manera transaccional e idempotente.

8. Se informa al empleado y a Recursos Humanos de las resoluciones.

9. La auditoría conserva ambos pasos, sus actores, fechas y motivos.

### Reglas obligatorias

- Un empleado no puede aprobar su propia solicitud.

- Un jefe solo puede resolver solicitudes dentro de su ámbito autorizado.

- Los administradores no deben poder saltarse autorizaciones sin un proceso formal.

- Los rechazos deben conservarse.

- Las aprobaciones duplicadas deben impedirse en cada paso.

- No omitir la autorización del jefe ni el visto bueno del director. Un rechazo impide completar la aprobación.

- Los responsables deben identificarse mediante asignaciones organizacionales válidas.

- Debe contemplarse la suplencia formal.

- Las decisiones deben ser idempotentes.

- Una notificación fallida no debe invalidar una aprobación confirmada.

Para las solicitudes de los propios jefes, definir un superior o responsable designado por la dirección. No inventar una cadena jerárquica inexistente.

Los permisos de RR. HH. para configurar políticas no deben confundirse con facultades automáticas para aprobar solicitudes.

---

## 7. REGLAS DE VACACIONES

El módulo debe implementar una contabilidad trazable de días.

Considerar:

- Fecha de ingreso.

- Antigüedad.

- Días correspondientes.

- Días disponibles.

- Días solicitados.

- Días aprobados.

- Días disfrutados.

- Ajustes.

- Cancelaciones.

Evitar guardar únicamente un saldo mutable sin historial.

Las políticas deben ser versionadas y configurables bajo autorización.

No asumir reglas no confirmadas por la empresa.

Antes de implementar cálculos definitivos, documentar las decisiones legales y operativas pendientes.

---

## 8. SEGURIDAD

Aplicar controles proporcionales a un sistema interno con datos personales.

Requisitos:

- Autenticación segura.

- Autorización del lado servidor.

- Contraseñas mediante algoritmo apropiado de hashing.

- Cookies seguras cuando se utilicen sesiones web.

- Protección CSRF cuando corresponda.

- Protección XSS.

- Prevención de inyección SQL.

- Validación estricta de entradas.

- Rate limiting en endpoints sensibles.

- Control de acceso a documentos.

- Restricción de acceso por departamento.

- Auditoría de operaciones críticas.

- Manejo centralizado de errores.

- Mensajes que no expongan detalles internos.

- Gestión segura de secretos.

- Respaldos y procedimiento de restauración.

No implementar autenticación biométrica facial propia.

No almacenar huellas digitales ni plantillas biométricas.

La autenticación biométrica nativa podrá evaluarse para proteger sesiones o confirmar marcajes, sin considerarla por sí sola prueba suficiente de identidad laboral.

---

## 9. FECHAS Y ZONAS HORARIAS

Utilizar zonas horarias IANA.

- Persistir instantes en UTC.

- Mostrar fechas y horas en la zona aplicable.

- Conservar la zona de referencia de los turnos.

- Soportar turnos que cruzan medianoche.

- Evitar conversiones ambiguas.

- No utilizar la hora del dispositivo como autoridad absoluta.

- Usar fechas civiles para conceptos que no representan instantes.

- Definir claramente intervalos y sus límites.

La interfaz utilizará inicialmente español de México:

- Locale: `es-MX`.

- Fechas comprensibles para usuarios mexicanos.

- Formato de hora configurable.

- Mensajes en español.

---

## 10. UX/UI

El sistema debe tener una interfaz:

- Moderna.

- Minimalista.

- Profesional.

- Clara.

- Accesible.

- Responsiva.

- Rápida.

- Consistente.

Utilizar shadcn/ui como base de componentes.

No instalar plantillas administrativas gigantes.

No crear efectos visuales que dificulten el trabajo.

### Panel administrativo

Debe contemplar:

- Dashboard.

- Empleados.

- Departamentos.

- Calendario de turnos.

- Asistencias.

- Vacaciones.

- Permisos.

- Justificaciones.

- Solicitudes pendientes.

- Historial de resoluciones.

- Configuración autorizada.

### Calendario

Debe permitir, cuando se implemente:

- Visualización diaria, semanal y mensual según necesidad.

- Asignación visual de turnos.

- Drag & drop.

- Cambios de modalidad.

- Guardias.

- Descansos.

- Identificación de conflictos.

- Confirmación de cambios.

- Historial de modificaciones.

Toda modificación se valida en el backend.

No confiar únicamente en validaciones visuales.

### Aplicación móvil

Priorizar:

- Registrar entrada.

- Registrar salida.

- Consultar turno.

- Consultar asistencia.

- Solicitar vacaciones.

- Solicitar permisos.

- Presentar justificaciones.

- Consultar solicitudes y sus estados.

La experiencia móvil debe requerir pocos pasos.

---

## 11. PERSISTENCIA Y CONSISTENCIA

PostgreSQL será la fuente de verdad.

Aplicar:

- Claves primarias.

- Claves foráneas.

- Restricciones únicas.

- Índices justificados.

- Transacciones.

- Control de concurrencia.

- Migraciones reproducibles.

- Integridad referencial.

- Idempotencia de operaciones críticas.

No usar Redis como fuente de verdad.

No introducir Redis sin una necesidad concreta.

Si se implementan trabajos diferidos, garantizar su persistencia y recuperación.

Las notificaciones deben diseñarse para no perder eventos importantes después de confirmar una transacción.

---

## 12. ESTÁNDARES DE CALIDAD

TypeScript strict obligatorio.

Evitar:

- `any` injustificado.

- Dependencias circulares.

- Controladores con lógica de negocio.

- Componentes React gigantes.

- Consultas SQL dispersas.

- Duplicación de validaciones.

- Funciones con demasiadas responsabilidades.

- Abstracciones artificiales.

- Código muerto.

- Dependencias no utilizadas.

- Excepciones silenciadas.

### Pruebas

Implementar pruebas unitarias para reglas de negocio, integración para persistencia y API, y pruebas de extremo a extremo para flujos críticos cuando corresponda.

Priorizar escenarios como:

- Solicitud de vacaciones sin saldo.

- Aprobación por jefe no autorizado.

- Autoaprobación.

- Doble aprobación.

- Aplicación de efectos antes del visto bueno del director.

- Marcaje presencial sin geolocalización o con precisión insuficiente.

- Solicitudes superpuestas.

- Cambio de turno con conflicto.

- Entrada fuera de geocerca.

- Fallo de notificación después de una aprobación.

- Marcaje duplicado.

- Reintento de operación idempotente.

No inventar resultados de pruebas ni declarar que algo funciona sin ejecutarlas.

---

## 13. DOCUMENTACIÓN OBLIGATORIA

Crear documentación útil, breve y mantenible.

Archivos recomendados:

```
docs/├── architecture/│   ├── SYSTEM_OVERVIEW.md│   ├── MODULE_BOUNDARIES.md│   ├── DATA_MODEL.md│   ├── SECURITY.md│   └── APPROVAL_WORKFLOWS.md├── adr/│   └── ADR-001-ARCHITECTURE.md└── DEVELOPMENT.md
```

Crear un `AGENTS.md` que documente:

- Principios arquitectónicos.

- Límites de módulos.

- Convenciones.

- Reglas de importación.

- Prohibiciones.

- Comandos de verificación.

- Definición de terminado.

- Reglas para modificaciones futuras.

No generar documentación repetitiva que nadie vaya a mantener.

---

## 14. FORMA DE TRABAJAR

Trabajar de manera incremental.

Antes de escribir código:

1. Inspeccionar el repositorio existente.

2. Identificar archivos y decisiones ya presentes.

3. No sobrescribir trabajo existente sin justificación.

4. Revisar el alcance de la tarea.

5. Identificar riesgos y dependencias.

6. Explicar brevemente qué se va a implementar.

Durante la implementación:

- Cambiar solamente lo necesario.

- Respetar los límites modulares.

- No introducir funcionalidades no solicitadas.

- No hacer refactorizaciones ajenas al objetivo.

- Evitar código provisional inseguro.

- No utilizar mocks en producción.

- No fingir integraciones terminadas.

- Implementar pruebas para las reglas nuevas.

Al finalizar cada etapa:

- Ejecutar lint.

- Ejecutar typecheck.

- Ejecutar pruebas.

- Verificar build.

- Revisar migraciones.

- Reportar errores.

- Identificar riesgos pendientes.

- Documentar cómo ejecutar lo implementado.

Si alguna verificación no se puede ejecutar, explicar el motivo exacto.

No declarar tareas terminadas si todavía hay fallos conocidos relacionados con el alcance implementado.

---

# 15. PRIMERA EJECUCIÓN: ALCANCE ESTRICTO

**IMPORTANTE: NO IMPLEMENTAR TODO EL SISTEMA AHORA.**

En esta primera ejecución debes construir la base arquitectónica y completar una primera funcionalidad vertical.

### Etapa A: preparación

1. Revisar el repositorio.

2. Crear la estructura inicial del monorepo.

3. Configurar pnpm Workspaces.

4. Configurar TypeScript strict.

5. Configurar Fastify.

6. Configurar PostgreSQL y Drizzle.

7. Configurar React + Vite.

8. Incorporar Tailwind CSS y shadcn/ui.

9. Configurar ESLint y Prettier.

10. Configurar pruebas automatizadas.

11. Configurar variables de entorno.

12. Crear Docker Compose de desarrollo.

13. Configurar documentación básica.

14. Establecer reglas de arquitectura.

No crear todavía la aplicación móvil completa.

### Etapa B: primera funcionalidad vertical

Implementar un módulo funcional mínimo de **Departamentos**.

Debe incluir:

- Entidad de dominio.

- Validaciones.

- Caso de uso de creación.

- Caso de uso de consulta.

- Persistencia PostgreSQL.

- Migración.

- API Fastify.

- Contratos de entrada y salida.

- Manejo de errores.

- Pruebas unitarias y de integración.

- Una pantalla React con shadcn/ui para listar y crear departamentos.

- Estados de carga, error y vacío.

El objetivo es comprobar la arquitectura completa:

**React → Fastify → Caso de uso → PostgreSQL → Respuesta → React**

No implementar todavía reglas de aprobaciones, vacaciones ni asistencia dentro de esta primera funcionalidad.

### Etapa C: verificación

Confirmar mediante pruebas reales:

- Que la API inicia correctamente.

- Que el frontend compila.

- Que PostgreSQL conecta.

- Que las migraciones funcionan.

- Que un departamento puede crearse.

- Que los departamentos pueden consultarse.

- Que la validación rechaza datos inválidos.

- Que se aplican correctamente los errores HTTP.

- Que los tests pasan.

- Que las reglas de importación modular se cumplen.

### Etapa D: entrega

Al finalizar, proporcionar:

1. Resumen de lo implementado.

2. Estructura final de carpetas.

3. Decisiones arquitectónicas tomadas.

4. Comandos para ejecutar el proyecto.

5. Comandos de pruebas.

6. Dependencias agregadas.

7. Limitaciones existentes.

8. Pendientes para la siguiente etapa.

No avanzar automáticamente al módulo de Empleados.

---

## 16. CRITERIO FINAL

El proyecto debe ser una solución profesional para una empresa real con aproximadamente 30 empleados.

No debe convertirse en una arquitectura sobredimensionada.

Las reglas de negocio son más importantes que las tecnologías.

La modularidad debe ser verificable mediante contratos, pruebas y restricciones de dependencias, no solamente carpetas.

Cada módulo debe poder evolucionar sin provocar modificaciones innecesarias en los demás.

**Construir correctamente, sin sobreingeniería, sin improvisación y sin inventar requisitos.**

Comienza inspeccionando el repositorio y ejecuta exclusivamente la primera etapa definida en este documento.
