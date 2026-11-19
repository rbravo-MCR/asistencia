# Empleados según referencia — implementación

Referencia: /home/rafael/Imágenes/Screenshots/Panel de empleados México Car Rental.png (1672×941). Autorización del usuario: implementar /empleados con esta composición.

- [x] Conservar snapshot y pruebas de comportamiento antes del cambio.
- [x] Tabla compacta con número, departamento, puesto, categoría, estado, ingreso y acciones; búsqueda/filtros/paginación locales del listado real.
- [x] Alta/edición lateral con los campos originales, validación y CSRF; responsive, foco y protección de borrador/pending.
- [x] Fondo raster Black & Gold y acabado de referencia; light/dark. Fotos, exportación y Vacaciones no existen en contrato: no simularlos. Ver expediente conserva datos completos.
- [x] Pruebas y capturas Playwright, comparación con referencia y revisión visual antes de cierre. Mantener API/backend/dependencias y otras pantallas.

No crear nuevas rutas o catálogos. Puesto sigue siendo texto libre; número automático al crear. Superior/usuario vinculado y consecuencias de inactivar se conservan. Fondo generado de 9 KiB, sin fotos ficticias de empleados. Se ajusta el chrome del shell solo bajo clase de la ruta Empleados.

## Avance 19-11-2026

Implementación funcional y capturas disponibles en [evidencia](../../verification/2026-11-19-visual-redesign/README.md). Check y PostgreSQL aprobados. CRUD y diseño verificados en ambos proyectos. El gate E2E paralelo encontró una carrera de lectura/limpieza en Usuarios; la revalidación aislada pasa, pero no se declara cierre global. La comparación visual se conserva y el presupuesto integral de rendimiento sigue pendiente.

Verificación adicional: [suite E2E completa 78/78 con un worker](../../verification/2026-11-19-visual-redesign/evidence/e2e-serial.txt) y [24 mediciones de producción con datos sintéticos](../../verification/2026-11-19-visual-redesign/PERFORMANCE.md). Se conserva el fallo concurrente anterior como límite del gate paralelo; no se modifica configuración para ocultarlo. La dirección integral de las otras pantallas sigue pendiente de aprobación.
