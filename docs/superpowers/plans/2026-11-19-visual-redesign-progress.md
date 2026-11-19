# Ejecución — plan 2026-11-19-visual-redesign.md

Diseño aprobado por el usuario con «aprobado» el 19-11-2026. Objetivo completo: toda la parte visual de las 22 rutas, sin pedir nuevamente permiso para los bloques ya aprobados. La integración y QA se centralizan en el agente principal.

## Decisiones de ejecución

- Se conserva el checkout porque la rama no tiene commits y el árbol previo está sin seguimiento. Un worktree vacío o un commit inicial mezclarían trabajo anterior. Se preservan snapshots y manifiestos; no se ejecutan helpers basados en BASE/HEAD inexistentes.
- La aprobación habilita la alternativa recomendada: extender y pulir MCR. Se actualiza el estado de la propuesta, sin reabrir decisiones visuales resueltas.
- Empleados, Departamentos y Usuarios tienen trabajo válido; se integran y revisan, no se rehacen de cero.
- Interfaz `Page` y `QueryFeedback` conservada para que la adopción visual no altere reglas ni firmas de las features. Las composiciones específicas se trabajan en tareas posteriores.
- Pre-flight: tareas 2–7 consumen `PageHeader`, `Page`, `AsyncState` y `InlineNotice` de tarea 1; SidePanel existente sigue siendo la base de paneles. No hay cambios de contrato entre tareas.

## Estado

- Tareas 1–7: completas e integradas. Patrones/nav, acceso/cuenta/dashboard, asistencia/incidencias, calendario/turnos, equipo/responsables, solicitudes/aprobaciones/vacaciones y administración/soporte. Se preserva Empleados/Departamentos/Usuarios previo, extendiendo la composición por dominio.
- Tarea 8: completa para el cierre visual local. `pnpm check`: 236/236; integración PostgreSQL: 175/175; E2E serial completo: 88/88, sin reintentos. Capturas: 512 del gate final, matriz de 22 rutas a siete anchos y ambos temas. Revisión independiente y correcciones de privacidad, pending, borrador, foco y legibilidad concluidas.
- Producción de laboratorio: 72 cargas emparejadas contra baseline; cero errores/overflow, peor CLS final 0.0642 y LCP 860 ms. JS inicial 203.41 KiB gzip supera el presupuesto preliminar 200 KiB, que queda como meta explícita no cumplida; no impide acreditar el rediseño visual ni se presenta como listo para despliegue.
- [Informe integral](../../verification/2026-11-19-mcr-integral/README.md), capturas, logs, snapshots y comparación de rendimiento preservados. No despliegue, commit inicial ni cambios operativos.

## Rulings y revisiones

- Tras estabilizar las interfaces comunes, se aplicó dispatching-parallel-agents a tres dominios independientes (planning, requests, administration), con archivos exclusivos y sin servidores/pruebas globales concurrentes. El principal mantuvo asistencia/responsables/base y centraliza integración. Se sustituye la decisión inicial de ejecución exclusivamente inline por esta división técnica, sin modificar diseño ni alcance aprobado.
- `useWrite` y `useRequestWrite` mantienen firma/UUID/payload y ejecutan onSuccess después de invalidaciones. El pending cubre la secuencia completa.
- Helpers nativos de PlanningEditor y LocationEditor se unifican en `lib/native-form-changes.ts`; RequestPanel usa snapshot estable para los campos controlados/condicionales.
- Una revisión independiente encontró que navegar durante marcaje/resultado desconocido perdía el intento. Corregido con useBlocker, beforeunload y Link; regresión conserva exactamente el payload tras cancelar salida. Revisor confirmó cierre del hallazgo.
- Ampliación raíz de texto 200 % reprodujo recorte/overflow de controles en header de 72 px. Se conserva 72 px normal y se permite crecer/envolver al ampliar texto. E2E RED→GREEN, junto con contraste ambos temas (6/6).
- Adaptación de selectores: Actualizar resumen en dashboard; alta contextual de Responsables/planificación/solicitudes; auditoría ahora usa fila+panel. Aserciones de datos, CSRF, snapshots, privacidad y persistencia se conservan.
- Los logs de intentos iniciales interrumpidos/fallidos se conservan; no acreditan aprobación. El gate válido será la ejecución integrada final.

## Evidencia anterior

Antes de esta aprobación: 191 pruebas UI/unitarias, 175 PostgreSQL y 78 E2E seriales; el paralelo tiene carrera de lectura/limpieza de fixtures documentada. Son antecedentes, no sustituyen la verificación del nuevo código.

## Correcciones de revisión integral

- P1 privacidad: se cancelan/borran consultas privadas antes de emitir una sesión/alcance diferente; `sessionScope` canónico evita remontar por orden equivalente o simple refresco. AppShell remonta exclusivamente el contenido privado, preservando URL/filtros y la confirmación pública de recuperación. Regresiones de sesión 13/13 y foco/identidad 17/17 pasaron; gate integrado posterior aprobado en el cierre.
- Complemento por registro: Empleados resuelve el expediente seleccionado contra el listado vigente y oculta edición si el registro sale del alcance o hay rechazo de autorización. RED del panel con datos privados tras desaparecer del listado y GREEN posterior.
- P2 revocación: ConfirmAction registra useBlocker/beforeunload durante pending. RED permitió navegar a Inicio con DELETE retenido; GREEN conserva ruta/confirmación hasta concluir.
- P2 motivos: Incident conserva valor controlado y protege dirty/pending; History agrega estado de motivos y pide decisión antes de cambiar rango, bloquea filtro durante envío. RED perdía texto al filtrar; GREEN conserva texto al cancelar. Las guardas no alteran payload ni reglas del servidor.
- Los tres grupos de regresiones y sesión pasan en 38 casos focalizados. Se lanzó nuevamente check y E2E integrado después de estabilizar las correcciones.

## Gate de entrega y estabilidad de carga

- `pnpm check` de entrega pasa: 236 pruebas en 36 archivos, lint/límites/formato/tipos/build. Integración PostgreSQL: 175/175 en 17 archivos. E2E final aprobado: 88 casos con un worker.
- Los 403/409 en creación de solicitudes conservan texto, período, fechas, error y UUID; regresiones parametrizadas pasan. Recuperación E2E usa un código real y pegado de contraseña; el consumo se comprueba en PostgreSQL para no agotar el límite real con solicitudes redundantes entre proyectos.
- Las pruebas públicas esperan resolución de sesión antes de consultar nodos que legítimamente se remontan. La prueba de detalle privado espera la notificación del observer y comprueba también caché vacía, dirección y celular retirados. No se debilitó la privacidad ni se añadieron sleeps.
- Una ejecución check concurrente con E2E agotó el timeout de búsqueda de heading de Dashboard; la ejecución aislada de entrega pasó. Se preservan ambos logs, no se modifica producto para esconder el timeout.
- Revisión visual adicional: filtros móviles de Usuarios y desktop de Empleados ampliados; Calendario deja un único refresco central; Auditoría incorpora pista de desplazamiento y región enfocada; Vacaciones encabeza su vacío con el título de sección. Se conserva toda la lógica.
- Primer benchmark: 72 cargas sin errores/overflow; el CLS móvil de Dashboard/Asistencia seguía elevado. Traza de fuentes identificó el footer desplazándose durante sesión y consulta. Se reservó altura mínima del contenido privado; la medición final corroboró la corrección (CLS máximo 0.0642). Los números anteriores se preservan en `production-before-stability`.
- Documentación principal de frontend reconciliada: la pausa histórica en Departamentos está sustituida por la aprobación integral, sin borrar evidencias anteriores.

## Cierre local

El gate E2E final pasó 88/88 y el benchmark final 72/72. La nueva altura mínima del contenido elimina la contribución del footer al CLS visible; la mayor contribución restante de Asistencia está dentro de 0.1. Las fuentes finales y 512 capturas están archivadas. La comparación protegida histórica acredita 13 coincidencias, cero diferencias y 100 archivos sin baseline previo; no se inventa una comparación completa inexistente. La evidencia separa pruebas sintéticas de laboratorio, PostgreSQL de pruebas y configuración de producción. Se mantienen abiertos únicamente los límites/metas explícitos del informe, fuera de una afirmación de despliegue o certificación.
