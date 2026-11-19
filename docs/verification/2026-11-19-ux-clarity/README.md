# UX clara — Inicio, turnos, días y solicitudes

Implementación local del 19 de noviembre de 2026. Se conserva la identidad visual MCR aprobada. El objetivo es comprender qué hacer y encontrarlo sin conocer la estructura interna del sistema.

## Resultado

- Inicio ofrece acciones de vacaciones, horarios y administración según permisos. La búsqueda acepta términos como saldo, vacaciones, calendario y horario.
- **Asignar turnos** aplica una plantilla a una persona y fecha. La guía distingue guardar borrador de publicar. **Plantillas de turno** define horarios reutilizables. El editor muestra resumen de jornada, modalidad, zona horaria y cambio de día.
- Para trabajo presencial, el selector usa centros activos y autorizaciones del empleado vigentes en la fecha. La ausencia de autorización se explica antes de guardar. El enlace a Ubicaciones abre otra pestaña conservando el borrador. Home office mantiene centro nulo y no exige GPS.
- **Días disponibles** distingue Mis días y Equipo. Muestra disponible y en revisión; aprobado ya está descontado y disfrutado es un subconjunto de aprobado. Conserva movimientos por período; no suma personas o períodos ni infiere días por antigüedad.
- **Solicitudes** ofrece vacaciones, permisos y justificaciones. Permite preparar, revisar, editar y finalmente enviar. Conserva archivos privados al volver; revisar no envía ni genera UUID. Los reintentos inciertos conservan el mismo cuerpo y clave. Un historial vacío ofrece una siguiente acción.

## Evidencia

| Comprobación            | Resultado                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` final      | 258 pruebas / 37 archivos, lint, fronteras, formato, tipos y compilación correctos                                  |
| PostgreSQL              | 175 pruebas / 17 archivos correctos                                                                                 |
| E2E global serial       | 90 correctos, escritorio y móvil                                                                                    |
| E2E focal posterior     | 4 correctos; incluye 2 casos repetidos y 2 de pestaña de autorizaciones                                             |
| Pruebas focales finales | 55 correctas: solicitudes27, planificación26, intención2                                                            |
| Captura final           | 60 PNG: diez estados, anchos320/390/1440, claro/oscuro; cero POST de negocio, errores JS y desbordamientos globales |

Los logs están en [evidence](evidence/), la auditoría previa en [AUDIT.md](AUDIT.md), las capturas en [after](after/), el detalle de archivos en [source-changes.json](source-changes.json) y la comparación de laboratorio en [PERFORMANCE.md](PERFORMANCE.md). Se conservaron 516 PNG del E2E global antes de las corridas focales. Inspección visual manual representativa de todos los pasos, sin afirmar revisión manual de cada PNG.

No se modificaron backend, contratos, migraciones, dependencias o configuración operativa real. QA local no equivale a despliegue, validación en teléfono físico o certificación WCAG.

## Configuración pendiente indicada por el usuario

El centro principal está activo; el empleado reportado carece de autorización para ese centro. Se solicitó fecha de inicio y se dejó pendiente la modificación real hasta recibirla. Este bloqueo operativo es independiente del cierre de mejoras de interfaz.

Servidor de revisión: <http://127.0.0.1:5173/>. La cuenta de revisión es ficticia; las capturas no crearon solicitudes ni asignaciones.
