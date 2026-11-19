# Refinamiento de iconos — Departamentos

18-11-2026. Cambio visual acotado a Departamentos; no se extiende a otras pantallas.

- Marca vectorial propia y reusable de edificio, con líneas doradas y detalles blancos sobre negro, compartida por filas, drawer y vacío.
- Calendario discreto en fechas; edición y eliminación con contenedores tonales y trazo consistente.
- Crear usa Plus y guardar usa Check, conservando texto accesible y comportamiento. SVG decorativos ocultos al lector, sin sustituir nombres de acciones.
- Sin dependencias, cambios de API, permisos o reglas de negocio.

Verificación nueva: [build/typecheck](evidence/build.txt), [lint](evidence/lint.txt), [21 unitarias](evidence/unit.txt) y [4 Playwright](evidence/playwright.txt), todos aprobados. Se reutilizaron pruebas existentes adecuadas para este ajuste visual; no se añaden tests que solo repitan clases CSS. 44 capturas renovadas con datos QA de PostgreSQL aislado.

[Claro](screenshots/departments-light-1440.png) · [Oscuro](screenshots/departments-dark-1440.png) · [Acciones](screenshots/menu-light-desktop.png) · [Drawer](screenshots/drawer-dark-desktop.png).

La revisión visual del usuario sigue pendiente antes de propagar la referencia. Los presupuestos globales pendientes se mantienen en el informe anterior; no se repite ni se atribuye a este ajuste una certificación de producción.
