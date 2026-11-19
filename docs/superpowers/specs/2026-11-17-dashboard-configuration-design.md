# Dashboard y configuración administrativa

## Petición y alcance

El usuario pidió terminar el punto 1 de la secuencia acordada: dashboard y configuración administrativa. La aplicación móvil queda para el final. El objetivo es que cada persona vea sus pendientes al entrar y que ADMIN/HR encuentre las configuraciones existentes y sus faltantes desde una sola sección.

Diseño aprobado por el usuario el 17 de noviembre de 2026. La evidencia de implementación y verificación se registra por separado.

## Enfoque propuesto

Integrar un dashboard autenticado en el inicio actual y agregar `/configuracion`, utilizando Fastify, PostgreSQL, TypeBox y los componentes React existentes. El servidor calcula y filtra los indicadores; la web presenta resultados y enlaces. Se conserva la bienvenida pública para visitantes sin sesión.

Alternativas consideradas:

- Calcular todo en el navegador con los listados actuales: reduce código inicial, pero descarga detalles innecesarios y dificulta garantizar alcance y definiciones consistentes. Se descarta.
- Crear otro panel o almacenar contadores duplicados: agrega sincronización y mantenimiento sin necesidad para una empresa de aproximadamente 30 empleados. Se descarta.
- Integrar consultas de resumen y reutilizar las configuraciones: propuesta recomendada por su coherencia con el monolito existente.

Decisiones técnicas del implementador, sujetas a revisión: no agregar dependencias, tablas de contadores ni un motor de reportes. No convertir secretos ni opciones técnicas del servidor en formularios de negocio.

## Experiencia del dashboard

- Encabezado con nombre del usuario, fecha civil y hora de actualización del servidor.
- Sección personal, solo si tiene empleado vinculado: turno actual o próximo, estado de entrada/salida, incidencias sin resolver, solicitudes propias pendientes y saldo por período de vacaciones. Sin período concedido se muestra “Sin períodos concedidos”; no se presenta un saldo de cero como si fuera un cálculo confirmado.
- Sección de equipo para jefaturas y dirección según autoridad vigente: resumen de asistencia, incidencias y solicitudes que realmente pueden decidir. ADMIN/HR dispone de resumen general, pero su rol no le concede decisiones del jefe o del director.
- Avisos sin leer del usuario y accesos a las pantallas correspondientes.
- La tarjeta de decisiones aparece para cualquier usuario con `canHeadDecide` o `canDirectorDecide`, incluido el superior explícito de un jefe aunque no tenga jefatura propia.
- Estados de carga, vacío, error con reintento y actualización manual. No mostrar ceros si la consulta falló.
- Diseño adaptable a escritorio y celular, etiquetas accesibles y sin desbordamiento horizontal.

Los enlaces llevan a las pantallas existentes. Cuando una tarjeta representa un filtro, el destino debe abrir ese filtro o presentar los registros que componen el indicador; no debe prometer un detalle que el usuario no pueda consultar.

## Definiciones de indicadores

- La fecha inicial es la fecha civil del servidor en `APP_TIME_ZONE`; la respuesta incluye fecha, zona y hora de generación. No se confía en la fecha del dispositivo.
- El resumen diario cuenta turnos publicados de la fecha de trabajo seleccionada. Un turno nocturno pertenece a su fecha de inicio. El turno personal actual también puede haber comenzado el día anterior; la interfaz identifica su fecha y horario.
- Separar turnos programados, con entrada aceptada, con entrada y salida aceptadas, pendientes de evaluación, faltas evaluadas y ausencias autorizadas. Los contadores de marcajes y evaluaciones pueden describir dimensiones distintas y deben etiquetarse como tales.
- Una falta requiere evaluación persistida ABSENCE. No se deduce por ausencia de entrada, por reloj ni por una consulta al dashboard. La lectura no ejecuta evaluaciones ni genera incidencias.
- Incidencias pendientes: incidencias sin resolución aprobada. Haber capturado un motivo no las resuelve. Separar las que todavía requieren motivo del total sin resolver.
- Las incidencias sin resolver y solicitudes pendientes abarcan todo el historial autorizado; la asistencia usa la fecha seleccionada. Mostrar ese alcance junto a cada indicador.
- “Pendientes de evaluación” cuenta solo turnos cuya ventana de salida ya cerró y que carecen de evaluación persistida, respetando la activación inicial de asistencia. Separar los turnos por iniciar/en curso y no convertir turnos históricos anteriores a la activación en pendientes.
- Solicitudes pendientes: estados PENDING_HEAD/PENDING_DIRECTOR. La bandeja de acciones usa la autorización vigente del servicio de solicitudes, no el nombre del rol ni el total de solicitudes visibles.
- Vacaciones: reutilizar las reglas del libro de movimientos, mostrando disponible/reservado y período, sin sumar períodos como si fueran intercambiables.
- Los resúmenes conservan el mismo alcance de los módulos existentes; no incluyen motivos privados, contenido de archivos, coordenadas o datos de otros departamentos.
- El conteo de avisos sin leer debe ser una consulta exacta pública del módulo de auditoría; su listado actual limita la bandeja a 100 registros y no sirve para contar el total.

## Configuración administrativa

`/configuracion` exige ADMIN/HR y agrupa enlaces y estados verificables:

1. Organización: departamentos, empleados, responsables y suplencias.
2. Asistencia: política vigente, tolerancia, anticipación de entrada y margen de salida. Extraer el formulario existente a una pantalla dedicada y mantener compatibilidad con el acceso actual.
3. Horarios: plantillas, días laborables, festivos y calendario.
4. Ubicaciones: centros, radio, precisión y autorizaciones de empleados presenciales.
5. Ausencias: políticas versionadas, tipos de permiso y períodos/movimientos de vacaciones.
6. Acceso: usuarios solo para ADMIN. Auditoría solo para ADMIN. HR no recibe esos enlaces ni sus datos.

Cada sección conserva los formularios y validaciones de su módulo; no se duplican reglas en un segundo formulario central. Las escrituras mantienen CSRF, permisos, historial y comportamiento transaccional. Cambiar políticas no altera controles ni solicitudes históricas.

## Diagnóstico de configuración

Mostrar problemas con una explicación y enlace para resolverlos: falta de director vigente, departamentos con empleados activos sin jefatura válida, empleado activo sin cuenta activa vinculada, jefe sin superior válido cuando necesite solicitar, ausencia de plantillas activas para categorías presentes, ausencia de centro activo para personal presencial, falta de autorización de centro vigente, ausencia de política de vacaciones o tipos de permiso activos.

Identificar como información revisable, sin declarar error automático: empleados sin turnos próximos, ausencia de festivos cargados y empleados sin períodos concedidos. No todos los empleados tienen derecho a un período cumplido ni todos los días necesitan turno. No inventar vencimientos, concesiones o reglas empresariales para completar una lista.

Decisión técnica para el diagnóstico informativo: “Sin turnos publicados en los próximos 7 días”, incluyendo la fecha actual y mostrando las fechas del intervalo. Para determinar superior válido, reutilizar la misma cadena del módulo de solicitudes: empleado/cuenta activos, sin autoaprobación y con actor distinto del director; no basta un `supervisor_id` informado.

El diagnóstico usa fechas y vigencias del servidor y no modifica datos. Las advertencias administrativas completas se exponen solo a ADMIN/HR. La vinculación personal faltante puede explicarse al propio usuario, sin revelar la organización completa.

## Arquitectura y contratos

- Agregar contratos explícitos para dashboard y diagnóstico en `packages/contracts`, con errores y estructuras estrictas.
- Incorporar un módulo de consulta/composición con API pública `index.ts`; no importar repositorios privados de otros módulos.
- Preferir funciones públicas de resumen de cada módulo para compartir sus reglas. La composición recibe servicios por inyección; las consultas de cada dominio permanecen bajo su módulo.
- Endpoints autenticados `GET /api/dashboard` y diagnóstico administrativo `GET /api/configuration/status`; `Cache-Control: no-store`. Datos de sesión y alcance se resuelven en servidor en cada petición. Consultas y tipos públicos no aceptan un departamento arbitrario para ampliar el alcance.
- Las consultas son de lectura; no activan workers ni generan auditoría de cambios de negocio. No devolver archivos ni motivos personales para contar pendientes.
- Mantener las rutas existentes y agregar navegación a Configuración solo para usuarios autorizados. Invalidar o refrescar resúmenes después de cambios relevantes; limpiar los datos al cambiar/cerrar sesión.
- Asistencia y calendario tienen actualmente filtros en estado local: añadir parámetros de búsqueda validados para abrir los intervalos del dashboard; para contadores sin filtro equivalente, presentar el detalle autorizado en el propio dashboard antes del enlace general.

## Verificación y definición de terminado

- Pruebas PostgreSQL de empleado, jefe, suplente, director, ADMIN y HR; autoridad vencida/revocada; usuario sin empleado y departamentos ajenos.
- Probar turno nocturno, medianoche de Mérida, intento rechazado, falta todavía no evaluada, ausencia aprobada, motivo sin resolución y vacaciones sin períodos.
- Probar diagnóstico con configuraciones incompletas y completas, sin mutaciones al consultar.
- Pruebas UI de estados, navegación y acceso; integración de guardar política, recargar y comprobar versión nueva e historial conservado.
- Incluir superior explícito sin jefatura propia, más de 100 avisos y turnos anteriores a la activación de asistencia.
- E2E en escritorio/vista móvil con sesiones y PostgreSQL `_test`, incluyendo empleado frente a administración y ausencia de desbordamiento.
- Ejecutar `pnpm check`, suite PostgreSQL y Playwright; revisar capturas nuevas y documentar resultados reales.
- Actualizar README, desarrollo, API, hoja de ruta y evidencia de la etapa 17. No marcar la etapa terminada antes de esos resultados.

## Límites

No cargar responsables, turnos, políticas empresariales ni saldos reales como parte de este punto; eso corresponde al punto 2. No desplegar, provisionar infraestructura, enviar mensajes externos, crear app móvil, implementar biometría/offline, nómina o reportes exportables. Preservar el árbol sin seguimiento; no crear un commit inicial que mezcle todo el trabajo anterior.

## Revisión del diseño

Revisión independiente completada: diseño implementable sin decisiones nuevas de negocio. Se incorporaron precisiones sobre superior explícito, conteo exacto de avisos, activación de asistencia, horizontes temporales, filtros de destino y validación de la cadena de responsables. Diseño aprobado por el usuario; plan de implementación en `docs/superpowers/plans/2026-11-17-dashboard-configuration.md`.
