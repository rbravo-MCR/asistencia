# Documento de Arquitectura y Reglas de Negocio: Sistema de Asistencia

> Actualización confirmada por el usuario el 17-11-2026: la aprobación de jefatura es definitiva para permisos laborales nuevos (HEAD_ONLY). Esta decisión sustituye las exigencias anteriores de visto bueno de dirección en este documento. Se conserva el flujo HEAD_DIRECTOR únicamente en solicitudes históricas. La administración de accesos de usuarios permanece separada. Ver `docs/api/REQUESTS.md`.

Este documento centraliza todas las definiciones operativas, el stack tecnológico y la arquitectura de software (Clean Architecture) para el desarrollo del Sistema de Asistencia, diseñado para ser construido de forma modular con apoyo de Inteligencia Artificial.

> Actualización confirmada 18-11-2026: festivos oficiales LFT/INE México 2026–2027; entrada administrativa desde08:30 para inicio08:00 se acepta con falta justificable. Corte configurable relativo de30 minutos por categoría del turno, sin alterar operativos ni controles históricos. El motivo no equivale a aprobación; jefatura decide la justificación conservando los eventos. Ver `docs/verification/2026-11-18-official-holidays-attendance.md`.

---

## 1. Reglas de Negocio (Core del Sistema)

1. **Jornada Administrativa:** La jornada inicial del personal administrativo es de lunes a viernes, de 08:00 a 17:00. Todos los horarios y días de trabajo deben ser configurables; no codificar esta jornada como una constante universal.
2. **Tolerancia de Entrada:** Se otorga un margen de 10 minutos de gracia. El estatus de "Retardo" se dispara automáticamente a partir del minuto 11 respecto a la hora de entrada asignada.
3. **Personal Operativo:** Trabaja en home office mediante tres turnos configurables y asignados por calendario, con cobertura de fines de semana y guardias en días festivos. Los horarios iniciales son: turno 1 de 08:00 a 16:00, turno 2 de 16:00 a 00:00 del día siguiente y turno 3 de 00:00 a 08:00. Todos son configurables. El sistema debe soportar turnos que cruzan medianoche y conservar la fecha de inicio y fin; la rotación entre empleados queda pendiente de definir.
4. **Modalidad Presencial:** Administración e Informática trabajan de forma presencial. La modalidad de trabajo no es un rol de autorización. Sus horarios siguen siendo configurables.
5. **Seguridad y Validación del Marcaje:** 
   
   * **Presencial:** La geolocalización es obligatoria en cada marcaje de entrada y salida. El backend valida la ubicación autorizada y la precisión. Si falta ubicación o la precisión es insuficiente, el marcaje no se considera validado y el intento se conserva como excepción para revisión. El radio y la precisión aceptables quedan pendientes de definir. La validación IP/DDNS mencionada anteriormente queda pendiente de confirmar como control adicional; no sustituye la geolocalización.
   
   * **Home Office:** El personal remoto debe registrar entrada y salida de cada turno asignado, sin geolocalización ni validación de red obligatorias. Ambos marcajes se evalúan contra el horario configurado del turno.
   
   * **General:** Todo registro requiere validación biométrica (rostro/huella) nativa del teléfono celular.
6. **Hora Inalterable:** El sistema de asistencia se rige única y estrictamente por la hora del servidor central (AWS), ignorando por completo la hora local configurada en el dispositivo móvil del usuario para evitar fraudes.
7. **Justificación Obligatoria:** Todo registro fuera del margen de tolerancia bloquea el flujo normal en la app móvil y exige al empleado ingresar un motivo o adjuntar evidencia para la autorización del jefe de departamento y el visto bueno del director.
8. **Control de Salidas Anticipadas:** Registrar la salida antes de la hora de fin de la jornada o del turno asignado genera una excepción que requiere permiso o justificación. La evaluación debe utilizar el horario configurado aplicable, no una hora de salida universal.
9. **Gestión Administrativa:** Las vacaciones, permisos de ausencia y guardias se gestionan desde el panel web. El jefe de departamento autoriza y el director otorga el visto bueno. Los efectos definitivos se aplican solo cuando ambos pasos están completos; Recursos Humanos recibe las resoluciones. Conservar ambos pasos en auditoría e impedir autoaprobaciones y decisiones duplicadas.

---

## 2. Stack Tecnológico

El sistema se divide en tres piezas independientes que se comunican a través de APIs REST, manteniendo un ecosistema unificado en **TypeScript/JavaScript**.

* **Base de Datos:** PostgreSQL alojada en Amazon RDS.
* **Backend (API Central):** Node.js con Fastify. Uso de Drizzle ORM para el mapeo y tipado estricto de la base de datos.
* **Frontend (Panel Admin RRHH):** React Web empaquetado con Vite. Uso de Tailwind CSS y shadcn/ui para el diseño. Desplegado en AWS S3 + CloudFront (SPA).
* **Frontend (App Móvil Empleados):** React Native construido sobre Expo para generar los instalables de iOS y Android.
* **Seguridad (Opcional/Recomendado):** AWS Cognito para gestión de identidades y JWT.

---

## 3. Arquitectura del Backend (Clean Architecture / SRP)

El backend debe seguir el **Principio de Responsabilidad Única (SRP)**. El proyecto se organiza por dominios de negocio (`modules/`) y utilidades globales (`core/`). Cada módulo se divide estrictamente en 4 capas:

### Estructura de Directorios

```text
src/
├── core/                   # Utilidades globales puras
│   ├── database/           # Conexión PostgreSQL y cliente Drizzle
│   ├── network/            # Validadores de IP
│   └── time/               # Calculadoras de tolerancia, horas y fechas
│
├── modules/
│   ├── asistencia/         
│   │   ├── asistencia.routes.ts       # 1. Rutas: Define endpoints HTTP
│   │   ├── asistencia.controller.ts   # 2. Controlador: Extrae req y envía res
│   │   ├── asistencia.service.ts      # 3. Servicio: Reglas de negocio (El Cerebro)
│   │   └── asistencia.repository.ts   # 4. Repositorio: Única capa que toca Drizzle/BD
```

### Reglas de las Capas

- **Rutas:** Solo enrutan el tráfico HTTP hacia los controladores.

- **Controladores:** Extraen datos (`req.body`, `req.user.id`, `headers IP`), llaman al Servicio y retornan la respuesta JSON. No contienen lógica.

- **Repositorios:** Es la **única pieza** autorizada para importar y usar el ORM (Drizzle). Ejecuta los `SELECT`, `INSERT`, `UPDATE` en PostgreSQL.

- **Servicios:** Contienen la lógica. Llaman a las funciones del Repositorio para obtener datos, usan las funciones del directorio `core/` para hacer cálculos (ej. validar tolerancia), y dictaminan el resultado final.

## 4. Prompt Maestro para Generación con IA

*Copia y pega el siguiente prompt como contexto base antes de pedirle a tu herramienta de IA que genere una nueva función o módulo para este sistema:*

> **Contexto General del Sistema:** Estoy construyendo el Backend de un Sistema de Asistencia y Recursos Humanos. El stack tecnológico estricto es Node.js, Fastify, TypeScript y Drizzle ORM (conectado a AWS RDS PostgreSQL).
> 
> **Reglas Arquitectónicas (Clean Architecture):**
> 
> 1. **Principio de Responsabilidad Única (SRP):** El código debe estar estrictamente separado en 4 capas dentro de cada módulo: Rutas (`.routes.ts`), Controladores (`.controller.ts`), Servicios (`.service.ts`) y Repositorios (`.repository.ts`).
> 
> 2. **Capa de Repositorio:** Es la ÚNICA autorizada para importar y utilizar Drizzle. El Controlador y el Servicio no deben saber que existe una base de datos. Si el servicio necesita datos, debe llamar a una función del Repositorio.
> 
> 3. **Capa de Servicio:** Aquí vive la lógica de negocio. Debe orquestar el flujo llamando a funciones granulares y delegando cálculos complejos a funciones puras (que no dependen de la base de datos) alojadas en una carpeta `src/core/`.
> 
> 4. **Capa de Controlador:** Solo debe recibir `FastifyRequest`, extraer parámetros, mandarlos al Servicio y enviar la respuesta JSON mediante `FastifyReply`. No debe contener reglas de negocio.
> 
> 5. **Regla de Tiempos:** Toda lógica relacionada con fechas y horas debe ejecutarse con la hora del servidor (nunca confiar en la hora del cliente) y debe contemplar manejo estricto de zonas horarias.
> 
> **Tarea Actual:** Bajo estas reglas estrictas, necesito que me generes... [DESCRIBE AQUÍ TU NECESIDAD, ej: el esquema Drizzle para Asistencias y su archivo Repository correspondiente].
