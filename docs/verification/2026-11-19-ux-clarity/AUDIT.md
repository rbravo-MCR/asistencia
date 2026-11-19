# Auditoría de claridad UX — 19-11-2026

Objetivo: encontrar asignación de turnos y solicitar vacaciones entendiendo los días disponibles. Captura nueva sobre aplicación local, cuenta ficticia autorizada, sin escrituras. IAB y otros navegadores integrados ausentes; Chromium del proyecto. Se inspeccionaron las siete imágenes guardadas. No se interpreta una captura como certificación de accesibilidad.

| Paso               | Captura                                            | Estado y hallazgo                                                                                                                                  |
| ------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Inicio          | [Inicio](before/01-inicio.png)                     | Acceso funcional; faltan entradas claras a asignar turno y pedir vacaciones. Hero grande prioriza registro de asistencia aunque se pruebe gestión. |
| 2. Plantillas      | [Plantillas](before/02-plantillas.png)             | Configuración completa; se llama Turnos, pero no asigna empleados ni dirige a hacerlo. Festivos conservados.                                       |
| 3. Calendario      | [Asignación](before/03-asignacion.png)             | Acción Nuevo borrador no explica asignación; vacío genérico duplica agenda vacía y desplaza calendario.                                            |
| 4. Asignar         | [Formulario](before/03b-asignacion-formulario.png) | Campos y foco presentes; no se explica claramente plantilla→borrador→publicar y la ayuda usa jerga técnica.                                        |
| 5. Vacaciones      | [Días](before/04-dias.png)                         | Seis cantidades con peso parecido; no se separa uso histórico/disponibilidad y no hay acción para pedir días. Mezcla consulta personal/gestión.    |
| 6. Solicitudes     | [Historial](before/05-solicitudes.png)             | Entrada genérica y vacío sin guía; requiere conocer que vacaciones se solicitan aquí.                                                              |
| 7. Nueva solicitud | [Formulario](before/06-nueva-solicitud.png)        | Valores y controles reales; fechas antes del período, refrescos redundantes y no hay revisión previa.                                              |

![Vacaciones antes](before/04-dias.png)
![Formulario antes](before/06-nueva-solicitud.png)

Prioridad: clarificar tareas/destinos y días (alta), guiar creación/publicación y revisar solicitud (alta), compactar vacíos/ayudas y búsqueda por alias (media). Conservar MCR y trabajar sobre las pantallas existentes. Riesgos de accesibilidad a verificar interactivamente: foco al revisar/editar, preservación de borrador y selección por teclado, controles completos a320px y contraste de nuevas superficies en ambos temas. Las capturas de escritorio no acreditan esos comportamientos; se prueban tras implementar.
