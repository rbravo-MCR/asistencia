## Tarea para rediseño de FrontEnd

Estado al 19-11-2026: **rediseño integral de las 22 rutas implementado y verificado localmente**. La aprobación explícita del usuario sustituye la pausa anterior en Departamentos. [Diseño aprobado](superpowers/specs/2026-11-19-visual-redesign-design.md), [plan integral](superpowers/plans/2026-11-19-visual-redesign.md) e [informe de verificación](verification/2026-11-19-mcr-integral/README.md). El baseline y las entregas parciales siguientes se conservan como registro histórico; sus conteos no son los resultados de cierre actual.

1. **Contrastar las guías con el proyecto actual.** Leer las políticas del repositorio, contratos API y especificaciones del 17–18 de noviembre. Registrar diferencias antes de implementar.
2. **Inventariar el frontend y guardar el estado inicial.** Identificar rutas, componentes, permisos y pruebas. Capturar las pantallas actuales y medir rendimiento sobre una compilación de producción.
3. **Preparar la identidad visual.** Verificar logo original y disponibilidad/licencia de Google Sans. Centralizar colores, tipografía, espacios, bordes y estados en tokens. Implementar temas claro, oscuro y sistema.
4. **Actualizar los componentes reutilizables.** Botones, campos, tablas, etiquetas, filtros, diálogos y mensajes. Cubrir carga, vacío, error, acceso denegado, envío pendiente y resultado desconocido.
5. **Rediseñar la estructura de navegación.** Sidebar, encabezado, cuenta, avisos y navegación móvil. Mostrar únicamente rutas autorizadas y conservar filtros, foco y contexto al volver.
6. **Rediseñar acceso, recuperación y dashboard.** Aplicar la identidad MCR y glassmorphism moderado. Priorizar jornada propia o pendientes según capacidades. Usar indicadores y enlaces respaldados por datos reales.
7. **Rediseñar asistencia e incidencias.** Hacer visibles turno, modalidad y acción válida. Preservar GPS presencial, home office sin GPS, reintentos seguros y rechazo real del servidor. Separar evaluación, motivo y resolución.
8. **Rediseñar calendario y turnos.** Mejorar mes, agenda y edición de borradores. Mantener confirmación al mover, alternativa por formulario, manejo de conflictos y protección de turnos publicados.
9. **Rediseñar la gestión de personal.** Empleados, departamentos y responsables: búsquedas, formularios, vigencias, historial y protección de cuentas según permisos existentes.
10. **Rediseñar solicitudes, aprobaciones y vacaciones.** Mostrar restricciones de permisos por horas, evidencia y saldos por período. Habilitar decisiones mediante `canDecide` y conservar políticas e historial de aprobación.
11. **Completar las pantallas administrativas.** Ubicaciones, configuración general y de asistencia, políticas de ausencias, usuarios, auditoría, avisos, cuenta y estado técnico.
12. **Validar y cerrar cada fase con evidencia.** Ejecutar `pnpm check`, integración con PostgreSQL de prueba y E2E aplicables. Revisar móvil/escritorio, ambos temas, teclado, contraste, red lenta y sesión expirada. Entregar capturas, resultados, mediciones y pendientes.

**Accesibilidad, seguridad y rendimiento se revisan desde la primera fase**, no se dejan para el cierre. No se libera con defectos críticos de seguridad, marcaje, aprobación o navegación.

Quedan fuera del alcance inicial: app móvil nativa, PWA, offline, biometría, reportes nuevos y operaciones masivas. La adaptación móvil de estas tareas corresponde a la **web responsiva**.

Se completaron el contraste y el inventario sin modificar código de producto. Se ejecutaron 399 pruebas aprobadas y se guardaron 143 capturas, 18 mediciones de producción y un snapshot de las fuentes originales. Los defectos encontrados quedan documentados para las fases de implementación.

El punto 3 incorpora siete colores, Google Sans local, logo original y temas claro/oscuro/sistema; 423 pruebas aprobadas, más 28 revalidaciones finales, 36 capturas y 21 mediciones. JS inicial −10.4 %. En aquella entrega, los componentes nuevos, navegación premium y glassmorphism selectivo eran propuestas de fases siguientes; el estado vigente es la implementación integral de noviembre 19.

Actualización posterior a la revisión visual del usuario: [sidebar y Usuarios implementados y verificados](verification/2026-11-18-sidebar-users/README.md). Se adelanta este alcance concreto de navegación y Usuarios; el resto de patrones del punto 4, acceso/dashboard y pantallas operativas quedaron pendientes en esa fase, resueltos posteriormente en el plan integral.

Pausa histórica del 18-11-2026, sustituida por la aprobación integral del 19-11-2026: el usuario había pedido no continuar replicando el diseño en otros módulos. [Departamentos para revisión](verification/2026-11-18-departments-reference/README.md) contiene capturas claro/oscuro, drawer, menú, estados y evidencia técnica. Esa revisión condicionaba la continuación del roadmap anterior; no bloquea el alcance integral ya aprobado.
